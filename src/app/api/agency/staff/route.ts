import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { getAgencySession } from '@/lib/agency-auth';
import {
  assertInvitationEmailConfigured,
  InvitationEmailConfigurationError,
  sendStaffInvitationEmail,
} from '@/lib/agency-invitation-email';
import { dbQuery, ensureDatabaseSchema, pool } from '@/lib/db';

type StaffAccountRow = {
  id: string;
  name: string;
  nik: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  invitation_status: string | null;
};

function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function formatStaffAccounts(rows: StaffAccountRow[]) {
  return rows.map((staff) => ({
    id: staff.id,
    name: staff.name,
    nik: staff.nik,
    email: staff.email,
    phone: staff.phone,
    isActive: staff.is_active,
    createdAt: staff.created_at,
    invitationStatus: staff.invitation_status,
  }));
}

async function loadStaffAccounts(agencyId: string) {
  const result = await dbQuery<StaffAccountRow>(
    `SELECT u.id, u.name, u.nik, u.email, u.phone, u.is_active, u.created_at,
            invitation.status AS invitation_status
     FROM users u
     LEFT JOIN LATERAL (
       SELECT CASE
                WHEN accepted_at IS NOT NULL THEN 'accepted'
                WHEN expires_at <= NOW() THEN 'expired'
                ELSE delivery_status
              END AS status
       FROM agency_invitations
       WHERE user_id = u.id
       ORDER BY created_at DESC
       LIMIT 1
     ) invitation ON true
     WHERE u.agency_id = $1 AND u.role = 'Petugas'
     ORDER BY u.created_at DESC, u.name ASC`,
    [agencyId],
  );
  return formatStaffAccounts(result.rows);
}

async function deliverInvitation(invitationId: string, invitation: {
  name: string;
  email: string;
  agencyName: string;
  token: string;
}) {
  try {
    await sendStaffInvitationEmail(invitation);
    await dbQuery(
      `UPDATE agency_invitations SET delivery_status = 'sent'
       WHERE id = $1 AND accepted_at IS NULL`,
      [invitationId],
    );
    return true;
  } catch (error) {
    console.error('Staff invitation email delivery error:', error);
    await dbQuery(
      `UPDATE agency_invitations SET delivery_status = 'failed'
       WHERE id = $1 AND accepted_at IS NULL`,
      [invitationId],
    );
    return false;
  }
}

export async function GET() {
  try {
    const agencyAdmin = await getAgencySession();
    if (!agencyAdmin) {
      return NextResponse.json({ error: 'Masuk dengan akun Admin Instansi untuk melanjutkan.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const staff = await loadStaffAccounts(agencyAdmin.agency_id);
    return NextResponse.json({ staff }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get agency staff accounts error:', error);
    return NextResponse.json({ error: 'Gagal memuat akun Petugas instansi.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let client: PoolClient | null = null;
  try {
    const agencyAdmin = await getAgencySession();
    if (!agencyAdmin) {
      return NextResponse.json({ error: 'Masuk dengan akun Admin Instansi untuk melanjutkan.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const payload = await request.json();

    if (payload?.action === 'resend-invitation') {
      const id = String(payload?.id ?? '').trim();
      if (!id) return NextResponse.json({ error: 'Akun Petugas tidak valid.' }, { status: 400 });
      assertInvitationEmailConfigured();
      if (!pool) throw new Error('DATABASE_URL belum diatur.');

      client = await pool.connect();
      await client.query('BEGIN');
      const target = await client.query<{ id: string; name: string; email: string; agency_name: string }>(
        `SELECT u.id, u.name, u.email, agency.name AS agency_name
         FROM users u
         JOIN report_agencies agency ON agency.id = u.agency_id AND agency.is_active = true
         WHERE u.id = $1 AND u.agency_id = $2 AND u.role = 'Petugas' AND u.is_active = false
           AND NOT EXISTS (
             SELECT 1 FROM agency_invitations previous
             WHERE previous.user_id = u.id AND previous.accepted_at IS NOT NULL
           )
         FOR UPDATE OF u`,
        [id, agencyAdmin.agency_id],
      );
      if (!target.rows[0]) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Akun Petugas tidak ditemukan, sudah aktif, atau bukan anggota instansi ini.' }, { status: 404 });
      }

      const invitationId = randomUUID();
      const token = randomBytes(32).toString('base64url');
      await client.query(
        `UPDATE agency_invitations SET expires_at = NOW()
         WHERE user_id = $1 AND accepted_at IS NULL`,
        [id],
      );
      await client.query(
        `INSERT INTO agency_invitations (id, user_id, token_hash, expires_at, delivery_status)
         VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', 'pending')`,
        [invitationId, id, hashInvitationToken(token)],
      );
      await client.query('COMMIT');
      client.release();
      client = null;

      const sent = await deliverInvitation(invitationId, {
        name: target.rows[0].name,
        email: target.rows[0].email,
        agencyName: target.rows[0].agency_name,
        token,
      });
      const staff = await loadStaffAccounts(agencyAdmin.agency_id);
      const account = staff.find((item) => item.id === id);
      if (!account) throw new Error('Akun Petugas tidak ditemukan setelah undangan dibuat.');
      return NextResponse.json(
        sent
          ? { staff: account }
          : { staff: account, error: 'Akun tetap menunggu aktivasi, tetapi email undangan gagal dikirim. Periksa konfigurasi SMTP lalu coba kirim ulang.' },
        { status: sent ? 200 : 502 },
      );
    }

    const name = String(payload?.name ?? '').trim();
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const nik = String(payload?.nik ?? '').trim();
    const phone = String(payload?.phone ?? '').trim();
    if (name.length < 2 || name.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !/^\d{16}$/.test(nik) || phone.length < 6 || phone.length > 50) {
      return NextResponse.json({ error: 'Lengkapi nama, email valid, NIK 16 digit, dan nomor telepon.' }, { status: 400 });
    }
    assertInvitationEmailConfigured();
    if (!pool) throw new Error('DATABASE_URL belum diatur.');

    client = await pool.connect();
    const userId = randomUUID();
    const invitationId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const unusedPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    await client.query('BEGIN');
    const agency = await client.query<{ name: string }>(
      'SELECT name FROM report_agencies WHERE id = $1 AND is_active = true FOR SHARE',
      [agencyAdmin.agency_id],
    );
    if (!agency.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Instansi tidak aktif atau tidak ditemukan.' }, { status: 409 });
    }

    await client.query(
      `INSERT INTO users (id, nik, name, email, phone, password_hash, role, agency_id, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'Petugas', $7, false, false)`,
      [userId, nik, name, email, phone, unusedPasswordHash, agencyAdmin.agency_id],
    );
    await client.query(
      `INSERT INTO agency_invitations (id, user_id, token_hash, expires_at, delivery_status)
       VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', 'pending')`,
      [invitationId, userId, hashInvitationToken(token)],
    );
    await client.query('COMMIT');
    client.release();
    client = null;

    const sent = await deliverInvitation(invitationId, {
      name,
      email,
      agencyName: agency.rows[0].name,
      token,
    });
    const staff = await loadStaffAccounts(agencyAdmin.agency_id);
    const account = staff.find((item) => item.id === userId);
    if (!account) throw new Error('Akun Petugas tidak ditemukan setelah undangan dibuat.');
    return NextResponse.json(
      sent
        ? { staff: account }
        : { staff: account, error: 'Akun dibuat, tetapi email undangan gagal dikirim. Periksa konfigurasi SMTP lalu coba kirim ulang.' },
      { status: sent ? 201 : 502 },
    );
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch((rollbackError: unknown) => {
      console.error('Rollback staff invitation transaction error:', rollbackError);
    });
    if (error instanceof InvitationEmailConfigurationError) {
      return NextResponse.json({ error: 'Pengiriman email undangan belum dikonfigurasi. Periksa pengaturan SMTP dan APP_URL.' }, { status: 503 });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Email atau NIK tersebut sudah digunakan.' }, { status: 409 });
    }
    console.error('Create agency staff account error:', error);
    return NextResponse.json({ error: 'Gagal membuat akun Petugas.' }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PATCH(request: Request) {
  let client: PoolClient | null = null;
  let invitation: { id: string; name: string; email: string; agencyName: string; token: string } | null = null;
  try {
    const agencyAdmin = await getAgencySession();
    if (!agencyAdmin) {
      return NextResponse.json({ error: 'Masuk dengan akun Admin Instansi untuk melanjutkan.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const payload = await request.json();
    const id = String(payload?.id ?? '').trim();
    const action = payload?.action;
    if (!id || !['update', 'deactivate'].includes(action)) {
      return NextResponse.json({ error: 'Permintaan pengelolaan akun Petugas tidak valid.' }, { status: 400 });
    }
    if (!pool) throw new Error('DATABASE_URL belum diatur.');

    client = await pool.connect();
    await client.query('BEGIN');
    const target = await client.query<{
      id: string;
      is_active: boolean;
      has_accepted_invitation: boolean;
      agency_name: string;
    }>(
      `SELECT u.id, u.is_active, agency.name AS agency_name,
              EXISTS (
                SELECT 1 FROM agency_invitations invitation
                WHERE invitation.user_id = u.id AND invitation.accepted_at IS NOT NULL
              ) AS has_accepted_invitation
       FROM users u
       JOIN report_agencies agency ON agency.id = u.agency_id AND agency.is_active = true
       WHERE u.id = $1 AND u.agency_id = $2 AND u.role = 'Petugas'
       FOR UPDATE OF u`,
      [id, agencyAdmin.agency_id],
    );
    if (!target.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Akun Petugas tidak ditemukan atau bukan anggota instansi ini.' }, { status: 404 });
    }

    if (action === 'deactivate') {
      if (!target.rows[0].is_active) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Akun Petugas ini sudah nonaktif atau belum diaktifkan.' }, { status: 409 });
      }
      const assignments = await client.query<{ ticket_number: string }>(
        `SELECT ticket_number
         FROM reports
         WHERE assigned_staff_id = $1 AND status = 'Diproses'
           AND forwarded_at IS NOT NULL AND agency_response = 'Diterima'
         ORDER BY due_at ASC NULLS LAST
         LIMIT 3`,
        [id],
      );
      if (assignments.rowCount) {
        await client.query('ROLLBACK');
        const tickets = assignments.rows.map((report) => report.ticket_number).join(', ');
        return NextResponse.json({
          error: `Petugas masih memegang laporan aktif (${tickets}${assignments.rowCount === 3 ? ', dan lainnya' : ''}). Alihkan atau selesaikan tugas sebelum menonaktifkan akun.`,
        }, { status: 409 });
      }
      await client.query(
        `UPDATE users SET is_active = false
         WHERE id = $1 AND agency_id = $2 AND role = 'Petugas'`,
        [id, agencyAdmin.agency_id],
      );
      await client.query('DELETE FROM staff_sessions WHERE user_id = $1', [id]);
      await client.query('COMMIT');
      client.release();
      client = null;
      const staff = await loadStaffAccounts(agencyAdmin.agency_id);
      return NextResponse.json({ staff: staff.find((account) => account.id === id) });
    }

    const name = String(payload?.name ?? '').trim();
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const nik = String(payload?.nik ?? '').trim();
    const phone = String(payload?.phone ?? '').trim();
    if (name.length < 2 || name.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !/^\d{16}$/.test(nik) || phone.length < 6 || phone.length > 50) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Lengkapi nama, email valid, NIK 16 digit, dan nomor telepon.' }, { status: 400 });
    }

    if (!target.rows[0].is_active && !target.rows[0].has_accepted_invitation) {
      assertInvitationEmailConfigured();
      const token = randomBytes(32).toString('base64url');
      const invitationId = randomUUID();
      await client.query(
        `UPDATE agency_invitations SET expires_at = NOW()
         WHERE user_id = $1 AND accepted_at IS NULL`,
        [id],
      );
      await client.query(
        `INSERT INTO agency_invitations (id, user_id, token_hash, expires_at, delivery_status)
         VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', 'pending')`,
        [invitationId, id, hashInvitationToken(token)],
      );
      invitation = {
        id: invitationId,
        name,
        email,
        agencyName: target.rows[0].agency_name,
        token,
      };
    }

    await client.query(
      `UPDATE users SET name = $1, email = $2, nik = $3, phone = $4
       WHERE id = $5 AND agency_id = $6 AND role = 'Petugas'`,
      [name, email, nik, phone, id, agencyAdmin.agency_id],
    );
    await client.query('COMMIT');
    client.release();
    client = null;

    if (invitation) {
      const sent = await deliverInvitation(invitation.id, invitation);
      const staff = await loadStaffAccounts(agencyAdmin.agency_id);
      const account = staff.find((item) => item.id === id);
      if (!account) throw new Error('Akun Petugas tidak ditemukan setelah diperbarui.');
      return NextResponse.json(
        sent
          ? { staff: account }
          : { staff: account, error: 'Data akun diperbarui, tetapi email undangan gagal dikirim. Coba kirim ulang undangan.' },
        { status: sent ? 200 : 502 },
      );
    }

    const staff = await loadStaffAccounts(agencyAdmin.agency_id);
    return NextResponse.json({ staff: staff.find((account) => account.id === id) });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch((rollbackError: unknown) => {
      console.error('Rollback agency staff update error:', rollbackError);
    });
    if (error instanceof InvitationEmailConfigurationError) {
      return NextResponse.json({ error: 'Pengiriman email undangan belum dikonfigurasi. Periksa pengaturan SMTP dan APP_URL.' }, { status: 503 });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Email atau NIK tersebut sudah digunakan.' }, { status: 409 });
    }
    console.error('Update agency staff account error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui akun Petugas.' }, { status: 500 });
  } finally {
    client?.release();
  }
}
