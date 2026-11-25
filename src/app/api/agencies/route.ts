import { NextResponse } from 'next/server';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const agencies = await dbQuery<{ id: string; name: string }>(
      'SELECT id, name FROM report_agencies WHERE is_active = true ORDER BY name ASC',
    );
    return NextResponse.json(agencies.rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get agencies error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar instansi.' }, { status: 500 });
  }
}