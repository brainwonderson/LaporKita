import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

export const ADMIN_SESSION_COOKIE = 'laporkita_admin_session';
const ADMIN_SESSION_DURATION_SECONDS = 8 * 60 * 60;

export function hashAdminSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAdminSession(userId: string) {
  await ensureDatabaseSchema();

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000);
  await dbQuery('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
  await dbQuery(
    `INSERT INTO admin_sessions (id, token_hash, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), hashAdminSessionToken(token), userId, expiresAt.toISOString()],
  );

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
    expires: expiresAt,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await ensureDatabaseSchema();
    await dbQuery('DELETE FROM admin_sessions WHERE token_hash = $1', [hashAdminSessionToken(token)]);
  }

  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureDatabaseSchema();
  const result = await dbQuery<{ id: string; name: string; email: string }>(
    `SELECT u.id, u.name, u.email
     FROM admin_sessions s
     JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.role = 'Admin' AND u.is_active = true
     LIMIT 1`,
    [hashAdminSessionToken(token)],
  );

  return result.rows[0] ?? null;
}