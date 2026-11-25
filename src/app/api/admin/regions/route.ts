import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

type RegionRow = {
  id: string;
  agency_id: string;
  agency_name: string;
  name: string;
  is_active: boolean;
  report_count: string;
};

async function loadRegions() {
  return dbQuery<RegionRow>(
    `SELECT r.id, r.agency_id, a.name AS agency_name, r.name, r.is_active,
            (SELECT COUNT(*) FROM reports rpt
             WHERE rpt.assigned_agency = a.name AND rpt.assigned_region = r.name)::text AS report_count
     FROM report_regions r
     JOIN report_agencies a ON a.id = r.agency_id
     ORDER BY a.name ASC, r.name ASC`,
  );
}

function formatRegions(rows: RegionRow[]) {
  return rows.map((row) => ({
    id: row.id,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
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
    const regions = await loadRegions();
    return NextResponse.json({ regions: formatRegions(regions.rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get admin regions error:', error);
    return NextResponse.json({ error: 'Gagal memuat data wilayah.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await getAdminSession()) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const payload = await request.json();
    const agencyId = String(payload?.agencyId ?? '').trim();
    const name = String(payload?.name ?? '').trim();
    if (!agencyId || name.length < 2 || name.length > 200) {
      return NextResponse.json({ error: 'Pilih instansi dan isi nama wilayah (2 sampai 200 karakter).' }, { status: 400 });
    }

    const activeAgency = await dbQuery<{ id: string }>(
      'SELECT id FROM report_agencies WHERE id = $1 AND is_active = true',
      [agencyId],
    );
    if (!activeAgency.rows[0]) {
      return NextResponse.json({ error: 'Pilih instansi aktif yang tersedia.' }, { status: 400 });
    }

    await dbQuery('INSERT INTO report_regions (id, agency_id, name) VALUES ($1, $2, $3)', [crypto.randomUUID(), agencyId, name]);
    const regions = await loadRegions();
    return NextResponse.json({ regions: formatRegions(regions.rows) }, { status: 201 });
  } catch (error) {
    if (isDuplicateNameError(error)) return NextResponse.json({ error: 'Wilayah tersebut sudah terdaftar pada instansi ini.' }, { status: 409 });
    console.error('Create admin region error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan wilayah.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Permintaan wilayah tidak valid.' }, { status: 400 });
    }

    const current = await dbQuery<{ name: string; agency_name: string; is_active: boolean }>(
      `SELECT r.name, a.name AS agency_name, r.is_active
       FROM report_regions r JOIN report_agencies a ON a.id = r.agency_id
       WHERE r.id = $1`,
      [id],
    );
    const existing = current.rows[0];
    if (!existing) return NextResponse.json({ error: 'Wilayah tidak ditemukan.' }, { status: 404 });

    if (action === 'toggle') {
      await dbQuery('UPDATE report_regions SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1', [id]);
    } else {
      const name = String(payload?.name ?? '').trim();
      if (name.length < 2 || name.length > 200) {
        return NextResponse.json({ error: 'Nama wilayah wajib diisi (2 sampai 200 karakter).' }, { status: 400 });
      }
      await dbQuery(
        `WITH old_region AS (
           SELECT r.name, a.name AS agency_name
           FROM report_regions r JOIN report_agencies a ON a.id = r.agency_id
           WHERE r.id = $2
         ), updated AS (
           UPDATE report_regions SET name = $1, updated_at = NOW()
           WHERE id = $2 RETURNING name
         ), report_updates AS (
           UPDATE reports rpt SET assigned_region = updated.name
           FROM old_region, updated
           WHERE rpt.assigned_agency = old_region.agency_name
             AND rpt.assigned_region = old_region.name
         )
         UPDATE report_routing_history history SET region = updated.name
         FROM old_region, updated
         WHERE history.agency = old_region.agency_name AND history.region = old_region.name`,
        [name, id],
      );
    }

    const regions = await loadRegions();
    return NextResponse.json({ regions: formatRegions(regions.rows) });
  } catch (error) {
    if (isDuplicateNameError(error)) return NextResponse.json({ error: 'Wilayah tersebut sudah terdaftar pada instansi ini.' }, { status: 409 });
    console.error('Update admin region error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui wilayah.' }, { status: 500 });
  }
}
