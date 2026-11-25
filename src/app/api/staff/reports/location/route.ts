import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/staff-auth';
import { dbQuery } from '@/lib/db';

type StaffLocationRow = {
  id: string;
  report_id: string;
  staff_id: string;
  staff_name?: string;
  coordinates: { lat: number; lng: number; accuracy?: number; displayAddress?: string };
  note: string;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const staff = await getStaffSession();
    if (!staff) {
      return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    if (!reportId) {
      return NextResponse.json({ error: 'ID laporan tidak disertakan.' }, { status: 400 });
    }

    const result = await dbQuery<StaffLocationRow>(
      `SELECT l.id, l.report_id, l.staff_id, u.name AS staff_name,
              l.coordinates, l.note, l.created_at
       FROM report_staff_locations l
       LEFT JOIN users u ON u.id = l.staff_id
       WHERE l.report_id = $1
       ORDER BY l.created_at DESC`,
      [reportId],
    );

    return NextResponse.json({
      locations: result.rows.map((row) => ({
        id: row.id,
        reportId: row.report_id,
        staffId: row.staff_id,
        staffName: row.staff_name,
        coordinates: row.coordinates,
        note: row.note,
        createdAt: row.created_at,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get staff locations error:', error);
    return NextResponse.json({ error: 'Gagal memuat riwayat lokasi penanganan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await getStaffSession();
    if (!staff) {
      return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });
    }

    const payload = await request.json();
    const reportId = String(payload?.reportId ?? '').trim();
    const coordinates = payload?.coordinates;
    const note = String(payload?.note ?? '').trim();

    if (!reportId) {
      return NextResponse.json({ error: 'ID laporan tidak valid.' }, { status: 400 });
    }

    const lat = Number(coordinates?.lat);
    const lng = Number(coordinates?.lng);
    const accuracy = typeof coordinates?.accuracy === 'number' ? Math.round(coordinates.accuracy) : undefined;
    const displayAddress = typeof coordinates?.displayAddress === 'string' ? coordinates.displayAddress.trim() : undefined;

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Koordinat lokasi GPS tidak valid.' }, { status: 400 });
    }

    const cleanCoordinates = {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      ...(accuracy !== undefined ? { accuracy } : {}),
      ...(displayAddress ? { displayAddress } : {}),
    };

    // Verify report assignment
    const reportCheck = await dbQuery<{ id: string; ticket_number: string }>(
      `SELECT id, ticket_number FROM reports
       WHERE id = $1 AND assigned_staff_id = $2 AND status = 'Diproses'`,
      [reportId, staff.id],
    );

    if (!reportCheck.rows[0]) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan atau Anda tidak ditugaskan pada laporan ini.' }, { status: 404 });
    }

    const ticketNumber = reportCheck.rows[0].ticket_number;
    const locationId = crypto.randomUUID();

    // Update report with latest staff handling coordinates
    const update = await dbQuery<{ staff_coordinates: unknown; staff_location_updated_at: string }>(
      `UPDATE reports
       SET staff_coordinates = $2,
           staff_location_updated_at = NOW(),
           staff_work_updated_at = NOW(),
           staff_work_updated_by = $3
       WHERE id = $1 AND assigned_staff_id = $3 AND status = 'Diproses'
       RETURNING staff_coordinates, staff_location_updated_at`,
      [reportId, JSON.stringify(cleanCoordinates), staff.id],
    );

    if (!update.rows[0]) {
      return NextResponse.json({ error: 'Gagal memperbarui lokasi laporan tugas.' }, { status: 409 });
    }

    // Insert to report_staff_locations history log
    await dbQuery(
      `INSERT INTO report_staff_locations (id, report_id, staff_id, coordinates, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [locationId, reportId, staff.id, JSON.stringify(cleanCoordinates), note],
    );

    // Record into status history for full transparency
    const locationDesc = displayAddress || `${cleanCoordinates.lat}, ${cleanCoordinates.lng}`;
    const historyNote = note
      ? `Petugas memperbarui lokasi penanganan (${note}): ${locationDesc}`
      : `Petugas memperbarui lokasi penanganan di lapangan: ${locationDesc}`;

    await dbQuery(
      `INSERT INTO report_status_history (report_id, previous_status, new_status, note)
       VALUES ($1, 'Diproses', 'Diproses', $2)`,
      [reportId, historyNote],
    );

    return NextResponse.json({
      success: true,
      message: `Lokasi penanganan berhasil diperbarui untuk laporan ${ticketNumber}.`,
      staffCoordinates: update.rows[0].staff_coordinates,
      staffLocationUpdatedAt: update.rows[0].staff_location_updated_at,
    });
  } catch (error) {
    console.error('Update staff location error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui lokasi penanganan.' }, { status: 500 });
  }
}
