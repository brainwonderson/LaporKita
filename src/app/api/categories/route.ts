import { NextResponse } from 'next/server';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const categories = await dbQuery<{ id: string; name: string; default_agency: string }>(
      `SELECT c.id, c.name, c.default_agency
       FROM report_categories c
       JOIN report_agencies a ON a.name = c.default_agency AND a.is_active = true
       WHERE c.is_active = true
       ORDER BY c.name ASC`,
    );
    return NextResponse.json(categories.rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Gagal memuat kategori laporan.' }, { status: 500 });
  }
}