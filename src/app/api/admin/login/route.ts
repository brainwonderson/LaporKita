import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminSession } from '@/lib/admin-auth';
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
    }>(
      `SELECT id, name, email, nik, password_hash, role, is_active
       FROM users
       WHERE ${identifierIsEmail ? 'email = $1' : 'nik = $1'}
       LIMIT 1`,
      [identifierIsEmail ? identifier.toLowerCase() : identifier.replace(/\D/g, '')],
    );
    const admin = result.rows[0];

    if (!admin || admin.role !== 'Admin' || !admin.is_active || !(await bcrypt.compare(password, admin.password_hash))) {
      return NextResponse.json({ error: 'Kredensial admin tidak valid.' }, { status: 401 });
    }

    await createAdminSession(admin.id);

    return NextResponse.json({
      user: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Gagal masuk. Pastikan database tersedia.' }, { status: 500 });
  }
}