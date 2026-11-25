import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

type AgencyRow = {
  id: string;
  name: string;
  is_active: boolean;
  report_count: string;
};

async function loadAgencies() {
  return dbQuery<AgencyRow>(
    `SELECT a.id, a.name, a.is_active,
            (SELECT COUNT(*) FROM reports r WHERE r.agency = a.name OR r.assigned_agency = a.name)::text AS report_count
     FROM report_agencies a
     ORDER BY a.created_at ASC, a.name ASC`,
  );
}

function formatAgencies(rows: AgencyRow[]) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    reportCount: Number(row.report_count),
  }));
}

function isDuplicateNameError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export async function GET() {
  try {
    if (!await getAdminSession()) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const agencies = await loadAgencies();
    return NextResponse.json({ agencies: formatAgencies(agencies.rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get admin agencies error:', error);
    return NextResponse.json({ error: 'Gagal memuat data instansi.' }, { status: 500 });
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
    if (name.length < 2 || name.length > 255) {
      return NextResponse.json({ error: 'Nama instansi wajib diisi (2 sampai 255 karakter).' }, { status: 400 });
    }
    await dbQuery('INSERT INTO report_agencies (id, name) VALUES ($1, $2)', [crypto.randomUUID(), name]);
    const agencies = await loadAgencies();
    return NextResponse.json({ agencies: formatAgencies(agencies.rows) }, { status: 201 });
  } catch (error) {
    if (isDuplicateNameError(error)) return NextResponse.json({ error: 'Nama instansi tersebut sudah digunakan.' }, { status: 409 });
    console.error('Create admin agency error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan instansi.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Permintaan instansi tidak valid.' }, { status: 400 });
    }

    const current = await dbQuery<{ name: string; is_active: boolean }>(
      'SELECT name, is_active FROM report_agencies WHERE id = $1',
      [id],
    );
    const existing = current.rows[0];
    if (!existing) return NextResponse.json({ error: 'Instansi tidak ditemukan.' }, { status: 404 });

    if (action === 'toggle') {
      if (existing.is_active) {
        const references = await dbQuery<{ exists: boolean }>(
          'SELECT EXISTS (SELECT 1 FROM report_categories WHERE is_active = true AND default_agency = $1) AS exists',
          [existing.name],
        );
        if (references.rows[0].exists) {
          return NextResponse.json({ error: 'Alihkan instansi default pada kategori aktif sebelum menonaktifkan instansi ini.' }, { status: 409 });
        }
      }
      await dbQuery('UPDATE report_agencies SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1', [id]);
    } else {
      const name = String(payload?.name ?? '').trim();
      if (name.length < 2 || name.length > 255) {
        return NextResponse.json({ error: 'Nama instansi wajib diisi (2 sampai 255 karakter).' }, { status: 400 });
      }
      await dbQuery(
        `WITH old_name AS (
           SELECT name FROM report_agencies WHERE id = $2
         ), updated AS (
           UPDATE report_agencies SET name = $1, updated_at = NOW()
           WHERE id = $2 RETURNING name
         ), category_updates AS (
           UPDATE report_categories c SET default_agency = updated.name
           FROM old_name, updated WHERE c.default_agency = old_name.name
         ), report_updates AS (
           UPDATE reports r SET
             agency = CASE WHEN r.agency = old_name.name THEN updated.name ELSE r.agency END,
             assigned_agency = CASE WHEN r.assigned_agency = old_name.name THEN updated.name ELSE r.assigned_agency END
           FROM old_name, updated
           WHERE r.agency = old_name.name OR r.assigned_agency = old_name.name
         )
         UPDATE report_routing_history h SET agency = updated.name
         FROM old_name, updated WHERE h.agency = old_name.name`,
        [name, id],
      );
    }

    const agencies = await loadAgencies();
    return NextResponse.json({ agencies: formatAgencies(agencies.rows) });
  } catch (error) {
    if (isDuplicateNameError(error)) return NextResponse.json({ error: 'Nama instansi tersebut sudah digunakan.' }, { status: 409 });
    console.error('Update admin agency error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui instansi.' }, { status: 500 });
  }
}