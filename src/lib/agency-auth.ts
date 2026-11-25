import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

export const AGENCY_SESSION_COOKIE = 'laporkita_agency_session';
const AGENCY_SESSION_DURATION_SECONDS = 8 * 60 * 60;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAgencySession(userId: string) {
  await ensureDatabaseSchema();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + AGENCY_SESSION_DURATION_SECONDS * 1000);
  await dbQuery('DELETE FROM agency_sessions WHERE expires_at <= NOW()');
  await dbQuery(
    `INSERT INTO agency_sessions (id, token_hash, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), hashToken(token), userId, expiresAt.toISOString()],
  );

  const cookieStore = await cookies();
  cookieStore.set(AGENCY_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: AGENCY_SESSION_DURATION_SECONDS,
    expires: expiresAt,
  });
}

export async function clearAgencySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AGENCY_SESSION_COOKIE)?.value;
  if (token) {
    await ensureDatabaseSchema();
    await dbQuery('DELETE FROM agency_sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  cookieStore.set(AGENCY_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export async function getAgencySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AGENCY_SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureDatabaseSchema();
  const result = await dbQuery<{
    id: string;
    name: string;
    email: string;
    agency_id: string;
    agency_name: string;
  }>(
    `SELECT u.id, u.name, u.email, a.id AS agency_id, a.name AS agency_name
     FROM agency_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN report_agencies a ON a.id = u.agency_id AND a.is_active = true
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
       AND u.role = 'Admin Instansi' AND u.is_active = true
     LIMIT 1`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}
