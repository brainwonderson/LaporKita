import { NextResponse } from 'next/server';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { getAdminSession } from '@/lib/admin-auth';
import { assertInvitationEmailConfigured, InvitationEmailConfigurationError, sendAgencyInvitationEmail } from '@/lib/agency-invitation-email';
import { dbQuery, ensureDatabaseSchema, pool } from '@/lib/db';

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Warga' | 'Petugas' | 'Admin Instansi';
  is_active: boolean;
  created_at: string;
  agency_name?: string | null;
  invitation_status?: string | null;
};

function formatUsers(rows: AdminUserRow[]) {
  return rows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at,
    agencyName: user.agency_name ?? null,
    invitationStatus: user.invitation_status ?? null,
  }));
}

function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function loadAdminUser(id: string) {
  const result = await dbQuery<AdminUserRow>(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
            agency.name AS agency_name,
            invitation.status AS invitation_status
     FROM users u
     LEFT JOIN report_agencies agency ON agency.id = u.agency_id
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
     WHERE u.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function deliverInvitation(invitationId: string, invite: {
  name: string;
  email: string;
  agencyName: string;
  token: string;
}) {
  try {
    await sendAgencyInvitationEmail(invite);
    await dbQuery(
      `UPDATE agency_invitations SET delivery_status = 'sent'
       WHERE id = $1 AND accepted_at IS NULL`,
      [invitationId],
    );
    return true;
  } catch (error) {
    console.error('Agency invitation email delivery error:', error);
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
    if (!await getAdminSession()) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const result = await dbQuery<AdminUserRow>(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              a.name AS agency_name, invitation.status AS invitation_status
       FROM users u
       LEFT JOIN report_agencies a ON a.id = u.agency_id
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
       WHERE u.role IN ('Warga', 'Petugas', 'Admin Instansi')
       ORDER BY u.created_at DESC, u.name ASC`,
    );
    return NextResponse.json({ users: formatUsers(result.rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get admin users error:', error);
    return NextResponse.json({ error: 'Gagal memuat data pengguna.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let client: PoolClient | null = null;
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    await ensureDatabaseSchema();

    const payload = await request.json();
    if (payload?.action === 'resend-invitation') {
      const id = String(payload?.id ?? '').trim();
      if (!id) return NextResponse.json({ error: 'Akun Admin Instansi tidak valid.' }, { status: 400 });
      assertInvitationEmailConfigured();
      if (!pool) throw new Error('DATABASE_URL belum diatur.');

      client = await pool.connect();
      await client.query('BEGIN');
      const target = await client.query<{ id: string; name: string; email: string; agency_name: string }>(
        `SELECT u.id, u.name, u.email, agency.name AS agency_name
         FROM users u
         JOIN report_agencies agency ON agency.id = u.agency_id AND agency.is_active = true
         WHERE u.id = $1 AND u.role = 'Admin Instansi' AND u.is_active = false
           AND NOT EXISTS (
             SELECT 1 FROM agency_invitations previous
             WHERE previous.user_id = u.id AND previous.accepted_at IS NOT NULL
           )
         FOR UPDATE OF u`,
        [id],
      );
      if (!target.rows[0]) {
        await client.query('ROLLBACK');
        client.release();
        client = null;
        return NextResponse.json({ error: 'Akun Admin Instansi tidak ditemukan, sudah aktif, atau instansinya nonaktif.' }, { status: 404 });
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
      await client.query(
        `INSERT INTO admin_activity_log (admin_id, action, details)
         VALUES ($1, 'agency_invitation_resent', $2)`,
        [admin.id, `Undangan aktivasi Admin Instansi ${target.rows[0].name} dikirim ulang`],
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
      const user = await loadAdminUser(id);
      if (!user) throw new Error('Akun Admin Instansi tidak ditemukan setelah undangan dibuat.');
      return NextResponse.json(
        sent
          ? { user: formatUsers([user])[0] }
          : { user: formatUsers([user])[0], error: 'Akun tetap menunggu aktivasi, tetapi email undangan gagal dikirim. Periksa konfigurasi SMTP lalu coba kirim ulang.' },
        { status: sent ? 200 : 502 },
      );
    }

    const name = String(payload?.name ?? '').trim();
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const nik = String(payload?.nik ?? '').trim();
    const phone = String(payload?.phone ?? '').trim();
    const agencyId = String(payload?.agencyId ?? '').trim();
    if (name.length < 2 || name.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !/^\d{16}$/.test(nik) || phone.length < 6 || phone.length > 50 || !agencyId) {
      return NextResponse.json({ error: 'Lengkapi nama, email valid, NIK 16 digit, telepon, dan instansi.' }, { status: 400 });
    }
    assertInvitationEmailConfigured();

    const agency = await dbQuery<{ id: string; name: string }>(
      'SELECT id, name FROM report_agencies WHERE id = $1 AND is_active = true',
      [agencyId],
    );
    if (!agency.rows[0]) return NextResponse.json({ error: 'Pilih instansi aktif yang tersedia.' }, { status: 400 });

    if (!pool) throw new Error('DATABASE_URL belum diatur.');
    client = await pool.connect();
    const userId = randomUUID();
    const invitationId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const unusedPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, nik, name, email, phone, password_hash, role, agency_id, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'Admin Instansi', $7, false, false)`,
      [userId, nik, name, email, phone, unusedPasswordHash, agencyId],
    );
    await client.query(
      `INSERT INTO agency_invitations (id, user_id, token_hash, expires_at, delivery_status)
       VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', 'pending')`,
      [invitationId, userId, hashInvitationToken(token)],
    );
    await client.query(
      `INSERT INTO admin_activity_log (admin_id, action, details)
       VALUES ($1, 'agency_admin_created', $2)`,
      [admin.id, `Undangan Admin Instansi ${name} dibuat untuk ${agency.rows[0].name}`],
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
    const user = await loadAdminUser(userId);
    if (!user) throw new Error('Akun Admin Instansi tidak ditemukan setelah dibuat.');
    return NextResponse.json(
      sent
        ? { user: formatUsers([user])[0] }
        : { user: formatUsers([user])[0], error: 'Akun dibuat, tetapi email undangan gagal dikirim. Periksa konfigurasi SMTP lalu coba kirim ulang.' },
      { status: sent ? 201 : 502 },
    );
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch((rollbackError: unknown) => {
      console.error('Rollback agency invitation transaction error:', rollbackError);
    });
    if (error instanceof InvitationEmailConfigurationError) {
      return NextResponse.json({ error: 'Pengiriman email undangan belum dikonfigurasi. Periksa pengaturan SMTP dan APP_URL.' }, { status: 503 });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Email atau NIK tersebut sudah digunakan.' }, { status: 409 });
    }
    console.error('Create agency admin user error:', error);
    return NextResponse.json({ error: 'Gagal membuat akun Admin Instansi.' }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const payload = await request.json();
    const id = String(payload?.id ?? '').trim();
    if (!id || typeof payload?.isActive !== 'boolean') {
      return NextResponse.json({ error: 'Permintaan perubahan status pengguna tidak valid.' }, { status: 400 });
    }

    const result = await dbQuery<AdminUserRow>(
      `WITH updated AS (
         UPDATE users
         SET is_active = $1
         WHERE id = $2
           AND role IN ('Warga', 'Petugas', 'Admin Instansi')
           AND (
             $1 = false
             OR role <> 'Admin Instansi'
             OR EXISTS (
               SELECT 1 FROM agency_invitations invitation
               WHERE invitation.user_id = users.id AND invitation.accepted_at IS NOT NULL
             )
           )
         RETURNING id, name, email, phone, role, is_active, created_at, agency_id
       ), activity AS (
         INSERT INTO admin_activity_log (admin_id, action, details)
         SELECT $3,
                CASE WHEN is_active THEN 'user_activated' ELSE 'user_deactivated' END,
                'Admin ' || CASE WHEN is_active THEN 'mengaktifkan' ELSE 'menonaktifkan' END || ' akun ' || name || ' (' || role || ')'
         FROM updated
         RETURNING id
       )
       SELECT updated.id, updated.name, updated.email, updated.phone,
              updated.role, updated.is_active, updated.created_at, agency.name AS agency_name,
              invitation.status AS invitation_status
       FROM updated
       LEFT JOIN report_agencies agency ON agency.id = updated.agency_id
       LEFT JOIN LATERAL (
         SELECT CASE
                  WHEN accepted_at IS NOT NULL THEN 'accepted'
                  WHEN expires_at <= NOW() THEN 'expired'
                  ELSE delivery_status
                END AS status
         FROM agency_invitations
         WHERE user_id = updated.id
         ORDER BY created_at DESC
         LIMIT 1
       ) invitation ON true
       CROSS JOIN activity`,
      [payload.isActive, id, admin.id],
    );
    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: 'Pengguna tidak ditemukan, tidak dapat dikelola, atau Admin Instansi belum menyelesaikan aktivasi.' }, { status: 404 });

    if (!user.is_active) {
      await dbQuery('DELETE FROM staff_sessions WHERE user_id = $1', [id]);
      await dbQuery('DELETE FROM agency_sessions WHERE user_id = $1', [id]);
      await dbQuery(
        `UPDATE agency_invitations SET expires_at = NOW()
         WHERE user_id = $1 AND accepted_at IS NULL`,
        [id],
      );
    }

    return NextResponse.json({ user: formatUsers([user])[0] });
  } catch (error) {
    console.error('Update admin user status error:', error);
    return NextResponse.json({ error: 'Gagal mengubah status pengguna.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let client: PoolClient | null = null;
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const url = new URL(request.url);
    const queryId = url.searchParams.get('id');
    const payload = await request.json().catch(() => ({}));
    const id = String(payload?.id || queryId || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna tidak valid.' }, { status: 400 });
    }

    if (!pool) throw new Error('DATABASE_URL belum diatur.');
    client = await pool.connect();
    await client.query('BEGIN');

    const targetUser = await client.query<AdminUserRow>(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              a.name AS agency_name
       FROM users u
       LEFT JOIN report_agencies a ON a.id = u.agency_id
       WHERE u.id = $1
       FOR UPDATE OF u`,
      [id],
    );

    const target = targetUser.rows[0];
    if (!target) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (target.role !== 'Admin Instansi') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Hanya akun Admin Instansi yang dapat dihapus.' }, { status: 403 });
    }

    // Hapus sesi & undangan terkait
    await client.query('DELETE FROM agency_sessions WHERE user_id = $1', [id]);
    await client.query('DELETE FROM staff_sessions WHERE user_id = $1', [id]);
    await client.query('DELETE FROM agency_invitations WHERE user_id = $1', [id]);
    await client.query('DELETE FROM user_notification_settings WHERE user_id = $1', [id]);
    await client.query('DELETE FROM admin_notifications WHERE admin_id = $1', [id]);

    // Hapus akun pengguna
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    // Catat ke log aktivitas admin
    await client.query(
      `INSERT INTO admin_activity_log (admin_id, action, details)
       VALUES ($1, 'user_deleted', $2)`,
      [
        admin.id,
        `Admin menghapus akun Admin Instansi ${target.name} (${target.email})${target.agency_name ? ` - Instansi: ${target.agency_name}` : ''}`,
      ],
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Akun Admin Instansi ${target.name} berhasil dihapus.`,
      deletedUserId: id,
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch((err) => {
        console.error('Rollback delete user error:', err);
      });
    }
    console.error('Delete admin user error:', error);
    return NextResponse.json({ error: 'Gagal menghapus akun pengguna.' }, { status: 500 });
  } finally {
    client?.release();
  }
}