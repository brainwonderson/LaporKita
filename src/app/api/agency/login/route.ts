import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { clearAgencySession, createAgencySession } from '@/lib/agency-auth';
import { clearAdminSession } from '@/lib/admin-auth';
import { clearStaffSession } from '@/lib/staff-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const identifier = String(payload?.identifier ?? '').trim();
    const password = String(payload?.password ?? '');
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/NIK dan kata sandi wajib diisi.' }, { status: 400 });
    }

    await ensureDatabaseSchema();
    const identifierIsEmail = identifier.includes('@');
    const result = await dbQuery<{
      id: string;
      name: string;
      email: string;
      nik: string;
      password_hash: string;
      role: string;
      is_active: boolean;
      agency_id: string | null;
      agency_name: string | null;
      agency_is_active: boolean | null;
    }>(
      `SELECT u.id, u.name, u.email, u.nik, u.password_hash, u.role, u.is_active,
              a.id AS agency_id, a.name AS agency_name, a.is_active AS agency_is_active
       FROM users u
       LEFT JOIN report_agencies a ON a.id = u.agency_id
       WHERE ${identifierIsEmail ? 'u.email = $1' : 'u.nik = $1'}
       LIMIT 1`,
      [identifierIsEmail ? identifier.toLowerCase() : identifier.replace(/\D/g, '')],
    );
    const agencyAdmin = result.rows[0];
    if (!agencyAdmin || agencyAdmin.role !== 'Admin Instansi' || !agencyAdmin.is_active
      || !agencyAdmin.agency_id || !agencyAdmin.agency_is_active
      || !(await bcrypt.compare(password, agencyAdmin.password_hash))) {
      return NextResponse.json({ error: 'Kredensial Admin Instansi tidak valid atau instansi sedang nonaktif.' }, { status: 401 });
    }

    await clearAdminSession();
    await clearStaffSession();
    await clearAgencySession();
    await createAgencySession(agencyAdmin.id);
    return NextResponse.json({
      user: {
        id: agencyAdmin.id,
        name: agencyAdmin.name,
        email: agencyAdmin.email,
        agencyId: agencyAdmin.agency_id,
        agencyName: agencyAdmin.agency_name,
      },
    });
  } catch (error) {
    console.error('Agency admin login error:', error);
    return NextResponse.json({ error: 'Gagal masuk. Pastikan database tersedia.' }, { status: 500 });
  }
}
