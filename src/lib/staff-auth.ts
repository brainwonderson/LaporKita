import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

const STAFF_SESSION_COOKIE = 'laporkita_staff_session';
const STAFF_SESSION_DURATION_SECONDS = 8 * 60 * 60;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createStaffSession(userId: string) {
  await ensureDatabaseSchema();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + STAFF_SESSION_DURATION_SECONDS * 1000);
  await dbQuery('DELETE FROM staff_sessions WHERE expires_at <= NOW()');
  await dbQuery(
    `INSERT INTO staff_sessions (id, token_hash, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), hashToken(token), userId, expiresAt.toISOString()],
  );

  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: STAFF_SESSION_DURATION_SECONDS,
    expires: expiresAt,
  });
}

export async function clearStaffSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (token) {
    await ensureDatabaseSchema();
    await dbQuery('DELETE FROM staff_sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  cookieStore.set(STAFF_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureDatabaseSchema();
  const result = await dbQuery<{ id: string; name: string }>(
    `SELECT u.id, u.name
     FROM staff_sessions s
     JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.role = 'Petugas' AND u.is_active = true
     LIMIT 1`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}