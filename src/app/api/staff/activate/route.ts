import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { ensureDatabaseSchema, pool } from '@/lib/db';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  let client: PoolClient | null = null;
  try {
    const payload = await request.json();
    const token = String(payload?.token ?? '').trim();
    const password = String(payload?.password ?? '');
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token) || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json({ error: 'Tautan aktivasi atau kata sandi tidak valid. Kata sandi minimal 12 karakter.' }, { status: 400 });
    }

    await ensureDatabaseSchema();
    if (!pool) throw new Error('DATABASE_URL belum diatur.');
    const validInvitation = await pool.query(
      `SELECT 1
       FROM agency_invitations invitation
       JOIN users user_account ON user_account.id = invitation.user_id
       JOIN report_agencies agency ON agency.id = user_account.agency_id AND agency.is_active = true
       WHERE invitation.token_hash = $1
         AND invitation.accepted_at IS NULL
         AND invitation.expires_at > NOW()
         AND invitation.delivery_status IN ('pending', 'sent', 'failed')
         AND user_account.role = 'Petugas'
         AND user_account.is_active = false
       LIMIT 1`,
      [hashToken(token)],
    );
    if (!validInvitation.rows[0]) {
      return NextResponse.json({ error: 'Tautan aktivasi tidak valid, sudah digunakan, atau telah kedaluwarsa.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    client = await pool.connect();
    await client.query('BEGIN');
    const invitation = await client.query<{ id: string; user_id: string }>(
      `SELECT invitation.id, user_account.id AS user_id
       FROM agency_invitations invitation
       JOIN users user_account ON user_account.id = invitation.user_id
       JOIN report_agencies agency ON agency.id = user_account.agency_id AND agency.is_active = true
       WHERE invitation.token_hash = $1
         AND invitation.accepted_at IS NULL
         AND invitation.expires_at > NOW()
         AND invitation.delivery_status IN ('pending', 'sent', 'failed')
         AND user_account.role = 'Petugas'
         AND user_account.is_active = false
       FOR UPDATE OF invitation, user_account`,
      [hashToken(token)],
    );
    if (!invitation.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Tautan aktivasi tidak valid, sudah digunakan, atau telah kedaluwarsa.' }, { status: 400 });
    }

    await client.query(
      `UPDATE users SET password_hash = $1, is_active = true, is_verified = true
       WHERE id = $2 AND role = 'Petugas'`,
      [passwordHash, invitation.rows[0].user_id],
    );
    await client.query(
      `UPDATE agency_invitations SET accepted_at = NOW(), delivery_status = 'accepted'
       WHERE id = $1`,
      [invitation.rows[0].id],
    );
    await client.query(
      `UPDATE agency_invitations SET expires_at = NOW()
       WHERE user_id = $1 AND id <> $2 AND accepted_at IS NULL`,
      [invitation.rows[0].user_id, invitation.rows[0].id],
    );
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Akun berhasil diaktifkan. Silakan masuk dengan email atau NIK dan kata sandi baru.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch((rollbackError: unknown) => {
      console.error('Rollback staff account activation error:', rollbackError);
    });
    console.error('Activate staff account error:', error);
    return NextResponse.json({ error: 'Gagal mengaktifkan akun. Silakan coba lagi.' }, { status: 500 });
  } finally {
    client?.release();
  }
}
