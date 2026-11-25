import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

type CategoryRow = {
  id: string;
  name: string;
  default_agency: string;
  is_active: boolean;
  report_count: string;
};

async function loadCategories() {
  return dbQuery<CategoryRow>(
    `SELECT c.id, c.name, c.default_agency, c.is_active,
            COUNT(r.id)::text AS report_count
     FROM report_categories c
     LEFT JOIN reports r ON r.category = c.name
     GROUP BY c.id
     ORDER BY c.created_at ASC, c.name ASC`,
  );
}

function formatRows(rows: CategoryRow[]) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    defaultAgency: row.default_agency,
    isActive: row.is_active,
    reportCount: Number(row.report_count),
  }));
}

export async function GET() {
  try {
    if (!await getAdminSession()) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const categories = await loadCategories();
    return NextResponse.json({ categories: formatRows(categories.rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get admin categories error:', error);
    return NextResponse.json({ error: 'Gagal memuat kategori laporan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await getAdminSession()) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const payload = await request.json();
    const name = String(payload?.name ?? '').trim();
    const defaultAgency = String(payload?.defaultAgency ?? '').trim();
    if (name.length < 2 || name.length > 50 || defaultAgency.length < 2 || defaultAgency.length > 255) {
      return NextResponse.json({ error: 'Nama kategori (2-50 karakter) dan instansi (2-255 karakter) wajib diisi.' }, { status: 400 });
    }
    const agency = await dbQuery<{ name: string }>(
      'SELECT name FROM report_agencies WHERE name = $1 AND is_active = true',
      [defaultAgency],
    );
    if (!agency.rows[0]) return NextResponse.json({ error: 'Pilih instansi aktif yang tersedia.' }, { status: 400 });

    const category = await dbQuery<{ id: string }>(
      `INSERT INTO report_categories (id, name, default_agency)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [crypto.randomUUID(), name, defaultAgency],
    );
    const categories = await loadCategories();
    return NextResponse.json({ categories: formatRows(categories.rows), createdId: category.rows[0].id }, { status: 201 });
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return NextResponse.json({ error: 'Nama kategori tersebut sudah digunakan.' }, { status: 409 });
    }
    console.error('Create admin category error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan kategori laporan.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await getAdminSession()) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const payload = await request.json();
    const id = String(payload?.id ?? '').trim();
    const action = payload?.action;
    if (!id || !['update', 'toggle'].includes(action)) {
      return NextResponse.json({ error: 'Permintaan kategori tidak valid.' }, { status: 400 });
    }

    if (action === 'toggle') {
      const current = await dbQuery<{ name: string; default_agency: string; is_active: boolean }>(
        'SELECT name, default_agency, is_active FROM report_categories WHERE id = $1',
        [id],
      );
      if (!current.rows[0]) return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
      if (!current.rows[0].is_active) {
        const agency = await dbQuery<{ id: string }>(
          'SELECT id FROM report_agencies WHERE name = $1 AND is_active = true',
          [current.rows[0].default_agency],
        );
        if (!agency.rows[0]) return NextResponse.json({ error: 'Pilih instansi aktif untuk kategori sebelum mengaktifkannya.' }, { status: 409 });
      }
      const result = await dbQuery<{ id: string }>(
        `UPDATE report_categories SET is_active = NOT is_active, updated_at = NOW()
         WHERE id = $1 RETURNING id`,
        [id],
      );
      if (!result.rows[0]) return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    } else {
      const name = String(payload?.name ?? '').trim();
      const defaultAgency = String(payload?.defaultAgency ?? '').trim();
      if (name.length < 2 || name.length > 50 || defaultAgency.length < 2 || defaultAgency.length > 255) {
        return NextResponse.json({ error: 'Nama kategori (2-50 karakter) dan instansi (2-255 karakter) wajib diisi.' }, { status: 400 });
      }
      const agency = await dbQuery<{ name: string }>(
        'SELECT name FROM report_agencies WHERE name = $1 AND is_active = true',
        [defaultAgency],
      );
      if (!agency.rows[0]) return NextResponse.json({ error: 'Pilih instansi aktif yang tersedia.' }, { status: 400 });
      const current = await dbQuery<{ name: string }>('SELECT name FROM report_categories WHERE id = $1', [id]);
      if (!current.rows[0]) return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
      await dbQuery(
        `UPDATE report_categories SET name = $1, default_agency = $2, updated_at = NOW()
         WHERE id = $3`,
        [name, defaultAgency, id],
      );
      await dbQuery('UPDATE reports SET category = $1 WHERE category = $2', [name, current.rows[0].name]);
    }

    const categories = await loadCategories();
    return NextResponse.json({ categories: formatRows(categories.rows) });
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return NextResponse.json({ error: 'Nama kategori tersebut sudah digunakan.' }, { status: 409 });
    }
    console.error('Update admin category error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui kategori laporan.' }, { status: 500 });
  }
}

function isDuplicateNameError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}