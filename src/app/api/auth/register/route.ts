import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';
import { createResidentSession } from '@/lib/resident-auth';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { nik, name, email, phone, password } = payload ?? {};

    if (!nik || !name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
    }

    await ensureDatabaseSchema();

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedNik = String(nik).trim();

    const existingUser = await dbQuery<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 OR nik = $2 LIMIT 1',
      [normalizedEmail, normalizedNik],
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return NextResponse.json({ error: 'Email atau NIK sudah terdaftar.' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(String(password), 10);

    const row = await dbQuery<{
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
    }>(
      `INSERT INTO users (
        id, nik, name, email, phone, password_hash, gender, birth_date, address, rt_rw, kelurahan, kecamatan, city, avatar_url, is_verified, created_at, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16)
      RETURNING id, nik, name, email, phone, gender, birth_date, address, rt_rw, kelurahan, kecamatan, city, avatar_url, is_verified, created_at, role`,
      [
        userId,
        normalizedNik,
        String(name).trim(),
        normalizedEmail,
        String(phone).trim(),
        passwordHash,
        'L',
        null,
        'Jl. Merdeka No. 10',
        '001 / 002',
        'Pancoran Mas',
        'Pancoran Mas',
        'Kota Depok',
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(name).trim())}`,
        true,
        'Warga',
      ],
    );

    const user = row.rows[0];
    await createResidentSession(user.id);

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
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Gagal mendaftarkan akun. Pastikan PostgreSQL sudah aktif dan DATABASE_URL benar.' },
      { status: 500 },
    );
  }
}
