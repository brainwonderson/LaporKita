import { NextResponse } from 'next/server';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';
import { getResidentSession } from '@/lib/resident-auth';

type ProfileUserRow = {
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
};

function toProfileUser(user: ProfileUserRow) {
  return {
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
  };
}

export async function GET() {
  try {
    const resident = await getResidentSession();
    if (!resident) return NextResponse.json({ error: 'Masuk dengan akun Warga untuk melihat profil.' }, { status: 401 });

    const result = await dbQuery<ProfileUserRow>(
      `SELECT id, nik, name, email, phone, gender, birth_date, address, rt_rw, kelurahan,
              kecamatan, city, avatar_url, is_verified, created_at, role
       FROM users
       WHERE id = $1 AND role = 'Warga' AND is_active = true
       LIMIT 1`,
      [resident.id],
    );
    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, { status: 401 });

    return NextResponse.json(
      { user: toProfileUser(user) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Gagal memuat profil.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const resident = await getResidentSession();
    if (!resident) return NextResponse.json({ error: 'Masuk dengan akun Warga untuk memperbarui profil.' }, { status: 401 });

    const payload = await request.json();
    const rest = payload ?? {};

    await ensureDatabaseSchema();

    const columnMap: Record<string, string> = {
      name: 'name',
      nik: 'nik',
      email: 'email',
      phone: 'phone',
      gender: 'gender',
      birthDate: 'birth_date',
      address: 'address',
      rtRw: 'rt_rw',
      kelurahan: 'kelurahan',
      kecamatan: 'kecamatan',
      city: 'city',
      avatarUrl: 'avatar_url',
      isVerified: 'is_verified',
    };

    const assignments: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(rest)) {
      const column = columnMap[key];
      if (!column || value === undefined || value === null) continue;

      assignments.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang diperbarui.' }, { status: 400 });
    }

    values.push(resident.id);
    const query = `
      UPDATE users
      SET ${assignments.join(', ')}
      WHERE id = $${index} AND role = 'Warga' AND is_active = true
      RETURNING id, nik, name, email, phone, gender, birth_date, address, rt_rw, kelurahan, kecamatan, city, avatar_url, is_verified, created_at, role
    `;

    const result = await dbQuery<ProfileUserRow>(query, values);

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, { status: 401 });
    }

    return NextResponse.json({ user: toProfileUser(user) });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui profil di PostgreSQL.' },
      { status: 500 },
    );
  }
}
