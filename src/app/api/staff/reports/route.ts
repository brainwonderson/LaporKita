import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/staff-auth';
import { dbQuery } from '@/lib/db';

type StaffReportRow = {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  assigned_agency: string;
  assigned_staff_id: string | null;
  due_at: string | null;
  status: 'Diproses' | 'Selesai';
  staff_work_status: 'Belum Dimulai' | 'Sedang Dikerjakan' | 'Menunggu Tindak Lanjut' | 'Terkendala' | 'Bukti Diajukan' | 'Selesai';
  location: string;
  coordinates: { lat?: number; lng?: number; displayAddress?: string } | null;
  urgency: string;
  description: string;
  images: string[] | null;
  completion_evidence: string[] | null;
  completion_notes: string | null;
  completion_submitted_at: string | null;
  staff_coordinates: { lat?: number; lng?: number; accuracy?: number; displayAddress?: string } | null;
  staff_location_updated_at: string | null;
};

type ObstacleRow = {
  id: string;
  report_id: string;
  staff_id: string;
  staff_name?: string;
  category: string;
  reason: string;
  photos: string[] | null;
  status: 'Menunggu Solusi' | 'Terselesaikan';
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  try {
    const staff = await getStaffSession();
    if (!staff) return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });

    const result = await dbQuery<StaffReportRow>(
      `SELECT id, ticket_number, title, category, assigned_agency,
              assigned_staff_id, due_at, status, staff_work_status, location, coordinates,
              urgency, description, images,
              completion_evidence, completion_notes, completion_submitted_at,
              staff_coordinates, staff_location_updated_at
       FROM reports
       WHERE status IN ('Diproses', 'Selesai') AND forwarded_at IS NOT NULL
         AND agency_response = 'Diterima'
         AND assigned_staff_id = $1
       ORDER BY CASE WHEN status = 'Diproses' THEN 0 ELSE 1 END,
                due_at ASC NULLS LAST, forwarded_at DESC`,
      [staff.id],
    );

    const reportIds = result.rows.map((r) => r.id);
    const obstaclesByReportId: Record<string, Array<{
      id: string;
      reportId: string;
      staffId: string;
      staffName?: string;
      category: string;
      reason: string;
      photos: string[];
      status: 'Menunggu Solusi' | 'Terselesaikan';
      resolutionNotes: string | null;
      resolvedAt: string | null;
      createdAt: string;
    }>> = {};

    if (reportIds.length > 0) {
      const obstacles = await dbQuery<ObstacleRow>(
        `SELECT o.id, o.report_id, o.staff_id, u.name AS staff_name, o.category, o.reason,
                o.photos, o.status, o.resolution_notes, o.resolved_at, o.created_at, o.updated_at
         FROM report_obstacles o
         LEFT JOIN users u ON u.id = o.staff_id
         WHERE o.report_id = ANY($1)
         ORDER BY o.created_at DESC`,
        [reportIds],
      );

      for (const obs of obstacles.rows) {
        if (!obstaclesByReportId[obs.report_id]) {
          obstaclesByReportId[obs.report_id] = [];
        }
        obstaclesByReportId[obs.report_id].push({
          id: obs.id,
          reportId: obs.report_id,
          staffId: obs.staff_id,
          staffName: obs.staff_name,
          category: obs.category,
          reason: obs.reason,
          photos: Array.isArray(obs.photos) ? obs.photos : [],
          status: obs.status,
          resolutionNotes: obs.resolution_notes,
          resolvedAt: obs.resolved_at,
          createdAt: obs.created_at,
        });
      }
    }

    return NextResponse.json({
      reports: result.rows.map((report) => ({
        id: report.id,
        ticketNumber: report.ticket_number,
        title: report.title,
        category: report.category,
        assignedAgency: report.assigned_agency,
        assignedStaffId: report.assigned_staff_id,
        dueAt: report.due_at,
        status: report.status,
        workStatus: report.staff_work_status,
        location: report.location,
        coordinates: report.coordinates,
        urgency: report.urgency,
        description: report.description,
        images: Array.isArray(report.images) ? report.images : [],
        completionEvidence: Array.isArray(report.completion_evidence) ? report.completion_evidence : [],
        completionNotes: report.completion_notes,
        completionSubmittedAt: report.completion_submitted_at,
        staffCoordinates: report.staff_coordinates,
        staffLocationUpdatedAt: report.staff_location_updated_at,
        obstacles: obstaclesByReportId[report.id] || [],
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get staff reports error:', error);
    return NextResponse.json({ error: 'Gagal memuat laporan tugas.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await getStaffSession();
    if (!staff) return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });

    const payload = await request.json();
    const reportId = String(payload?.reportId ?? '').trim();
    const workStatus = payload?.workStatus;
    if (!reportId || !['Sedang Dikerjakan', 'Menunggu Tindak Lanjut', 'Terkendala'].includes(workStatus)) {
      return NextResponse.json({ error: 'Status pekerjaan yang diminta tidak valid.' }, { status: 400 });
    }

    const update = await dbQuery<{ staff_work_status: string }>(
      `UPDATE reports
       SET staff_work_status = $2, staff_work_updated_at = NOW(), staff_work_updated_by = $3
       WHERE id = $1 AND assigned_staff_id = $3 AND status = 'Diproses'
         AND forwarded_at IS NOT NULL AND agency_response = 'Diterima'
         AND completion_submitted_at IS NULL
         AND (
           (staff_work_status = 'Belum Dimulai' AND $2 IN ('Sedang Dikerjakan', 'Terkendala'))
           OR (staff_work_status = 'Sedang Dikerjakan' AND $2 IN ('Menunggu Tindak Lanjut', 'Terkendala'))
           OR (staff_work_status = 'Menunggu Tindak Lanjut' AND $2 IN ('Sedang Dikerjakan', 'Terkendala'))
           OR (staff_work_status = 'Terkendala' AND $2 = 'Sedang Dikerjakan')
         )
       RETURNING staff_work_status`,
      [reportId, workStatus, staff.id],
    );
    if (!update.rows[0]) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan atau perpindahan status tersebut tidak diizinkan.' }, { status: 409 });
    }
    return NextResponse.json({ workStatus: update.rows[0].staff_work_status });
  } catch (error) {
    console.error('Update staff work status error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status pekerjaan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await getStaffSession();
    if (!staff) return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });

    const payload = await request.json();
    const reportId = String(payload?.reportId ?? '').trim();
    const notes = String(payload?.notes ?? '').trim();
    const evidence = payload?.evidence;
    if (!reportId || !Array.isArray(evidence) || evidence.length < 1 || evidence.length > 4) {
      return NextResponse.json({ error: 'Lampirkan 1 sampai 4 foto bukti penyelesaian.' }, { status: 400 });
    }
    if (evidence.some((item) => typeof item !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(item) || item.length > 4_200_000)) {
      return NextResponse.json({ error: 'Foto harus berupa JPG, PNG, atau WebP dan berukuran maksimal 3 MB per foto.' }, { status: 400 });
    }
    if (notes.length < 10 || notes.length > 1000) {
      return NextResponse.json({ error: 'Catatan penyelesaian wajib diisi (10 sampai 1.000 karakter).' }, { status: 400 });
    }

    const update = await dbQuery<{ id: string }>(
      `UPDATE reports
       SET completion_evidence = $2, completion_notes = $3,
           completion_submitted_by = $4, completion_submitted_at = NOW(),
           staff_work_status = 'Bukti Diajukan', staff_work_updated_at = NOW(),
           staff_work_updated_by = $4
       WHERE id = $1 AND status = 'Diproses' AND forwarded_at IS NOT NULL
         AND agency_response = 'Diterima'
         AND assigned_staff_id = $4
         AND completion_submitted_at IS NULL
         AND staff_work_status IN ('Sedang Dikerjakan', 'Menunggu Tindak Lanjut')
       RETURNING id`,
      [reportId, JSON.stringify(evidence), notes, staff.id],
    );
    if (!update.rows[0]) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan, belum siap diajukan, atau bukti sudah pernah dikirim.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Bukti penyelesaian berhasil dikirim kepada Admin Instansi.' });
  } catch (error) {
    console.error('Submit completion evidence error:', error);
    return NextResponse.json({ error: 'Gagal mengirim bukti penyelesaian.' }, { status: 500 });
  }
}