import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { clearAdminSession, createAdminSession } from '@/lib/admin-auth';
import { clearStaffSession, createStaffSession } from '@/lib/staff-auth';
import { clearAgencySession, createAgencySession } from '@/lib/agency-auth';
import { clearResidentSession, createResidentSession } from '@/lib/resident-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const identifier = String(payload?.identifier ?? '').trim();
    const password = String(payload?.password ?? '');
    const expectedRole = payload?.expectedRole;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier dan password wajib diisi.' }, { status: 400 });
    }
    if (expectedRole !== undefined && expectedRole !== 'Petugas') {
      return NextResponse.json({ error: 'Jenis akun yang diminta tidak valid.' }, { status: 400 });
    }

    await ensureDatabaseSchema();

    const rows = await dbQuery<{
      id: string;
      nik: string;
      name: string;
      email: string;
      phone: string;
      gender: string;
      birth_date: string | null;
      address: string;
      rt_rw: string;
      kelurahan: string;
      kecamatan: string;
      city: string;
      avatar_url: string;
      is_verified: boolean;
      created_at: string;
      role: string;
      is_active: boolean;
      password_hash: string;
    }>(
      `SELECT * FROM users WHERE email = $1 OR nik = $2 LIMIT 1`,
      [identifier.toLowerCase(), identifier.replace(/\D/g, '')],
    );

    const user = rows.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
    }
    if (expectedRole === 'Petugas' && user.role !== 'Petugas') {
      return NextResponse.json({ error: 'Halaman ini khusus untuk akun Petugas.' }, { status: 403 });
    }
    if (!user.is_active) {
      return NextResponse.json({ error: 'Akun Anda sedang dinonaktifkan. Hubungi administrator.' }, { status: 403 });
    }

    if (user.role === 'Admin') {
      await createAdminSession(user.id);
      await clearStaffSession();
      await clearAgencySession();
      await clearResidentSession();
    } else if (user.role === 'Petugas') {
      await clearAdminSession();
      await clearAgencySession();
      await clearResidentSession();
      await createStaffSession(user.id);
    } else if (user.role === 'Admin Instansi') {
      const agency = await dbQuery<{ id: string }>(
        'SELECT id FROM report_agencies WHERE id = (SELECT agency_id FROM users WHERE id = $1) AND is_active = true',
        [user.id],
      );
      if (!agency.rows[0]) return NextResponse.json({ error: 'Instansi akun ini sedang nonaktif atau belum ditautkan.' }, { status: 403 });
      await clearAdminSession();
      await clearStaffSession();
      await clearAgencySession();
      await clearResidentSession();
      await createAgencySession(user.id);
    } else if (user.role === 'Warga') {
      await clearAdminSession();
      await clearStaffSession();
      await clearAgencySession();
      await clearResidentSession();
      await createResidentSession(user.id);
    } else {
      await clearAdminSession();
      await clearStaffSession();
      await clearAgencySession();
      await clearResidentSession();
    }

    return NextResponse.json({
      user: {
        id: user.id,
        nik: user.nik,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender as 'L' | 'P',
        birthDate: user.birth_date || '1995-08-17',
        address: user.address,
        rtRw: user.rt_rw,
        kelurahan: user.kelurahan,
        kecamatan: user.kecamatan,
        city: user.city,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        createdAt: new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        role: user.role as 'Warga' | 'Petugas' | 'Admin' | 'Admin Instansi',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Gagal masuk. Pastikan PostgreSQL sudah aktif dan DATABASE_URL benar.' },
      { status: 500 },
    );
  }
}
