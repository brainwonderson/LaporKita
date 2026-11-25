import { NextResponse } from 'next/server';
import { getAgencySession } from '@/lib/agency-auth';
import { dbQuery } from '@/lib/db';

type AgencyReportRow = {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  location: string;
  coordinates: { lat?: number; lng?: number; displayAddress?: string } | null;
  status: string;
  urgency: string;
  date: string;
  description: string;
  images: string[] | null;
  reporter_name: string | null;
  is_anonymous: boolean;
  assigned_agency: string | null;
  assigned_region: string | null;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  due_at: string | null;
  forwarded_at: string;
  agency_response: string;
  agency_response_reason: string | null;
  agency_responded_at: string | null;
  created_at: string;
  completion_evidence: string[] | null;
  completion_notes: string | null;
  completion_submitted_at: string | null;
  completion_submitted_by: string | null;
  staff_work_status: string;
  staff_coordinates: { lat?: number; lng?: number; accuracy?: number; displayAddress?: string } | null;
  staff_location_updated_at: string | null;
};

type ReportStatusHistoryRow = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string;
  changed_at: string;
};

type ReportRoutingHistoryRow = {
  id: string;
  action: string;
  agency: string;
  region: string;
  details: string;
  created_at: string;
};

type ReportStaffAssignmentHistoryRow = {
  id: string;
  previous_staff_name: string | null;
  assigned_staff_name: string | null;
  previous_due_at: string | null;
  due_at: string;
  changed_by_name: string | null;
  created_at: string;
};

type ReportObstacleRow = {
  id: string;
  report_id: string;
  staff_id: string;
  staff_name: string | null;
  category: string;
  reason: string;
  photos: string[] | null;
  status: 'Menunggu Solusi' | 'Terselesaikan';
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(request: Request) {
  try {
    const agencyAdmin = await getAgencySession();
    if (!agencyAdmin) {
      return NextResponse.json({ error: 'Masuk dengan akun Admin Instansi untuk melanjutkan.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const historyFor = searchParams.get('historyFor');

    if (historyFor) {
      const reportCheck = await dbQuery<{ id: string }>(
        `SELECT id FROM reports
         WHERE id = $1 AND assigned_agency = $2 AND forwarded_at IS NOT NULL`,
        [historyFor, agencyAdmin.agency_name],
      );

      if (reportCheck.rowCount === 0) {
        return NextResponse.json({ error: 'Laporan tidak ditemukan atau tidak diteruskan ke instansi ini.' }, { status: 404 });
      }

      const [statusHistory, routingHistory, assignmentHistory, obstacleHistory] = await Promise.all([
        dbQuery<ReportStatusHistoryRow>(
          `SELECT id::text, previous_status, new_status, note, changed_at
           FROM report_status_history
           WHERE report_id = $1
           ORDER BY changed_at ASC, id ASC`,
          [historyFor],
        ),
        dbQuery<ReportRoutingHistoryRow>(
          `SELECT id, action, agency, region, details, created_at
           FROM report_routing_history
           WHERE report_id = $1
           ORDER BY created_at ASC, id ASC`,
          [historyFor],
        ),
        dbQuery<ReportStaffAssignmentHistoryRow>(
          `SELECT history.id::text, previous_staff.name AS previous_staff_name,
                  assigned_staff.name AS assigned_staff_name, history.previous_due_at,
                  history.due_at, changed_by.name AS changed_by_name, history.created_at
           FROM report_staff_assignment_history history
           LEFT JOIN users previous_staff ON previous_staff.id = history.previous_staff_id
           LEFT JOIN users assigned_staff ON assigned_staff.id = history.assigned_staff_id
           LEFT JOIN users changed_by ON changed_by.id = history.changed_by
           WHERE history.report_id = $1
           ORDER BY history.created_at ASC, history.id ASC`,
          [historyFor],
        ),
        dbQuery<ReportObstacleRow>(
          `SELECT o.id, o.report_id, o.staff_id, u.name AS staff_name, o.category, o.reason,
                  o.photos, o.status, o.resolution_notes, o.resolved_at, o.created_at, o.updated_at
           FROM report_obstacles o
           LEFT JOIN users u ON u.id = o.staff_id
           WHERE o.report_id = $1
           ORDER BY o.created_at DESC`,
          [historyFor],
        ),
      ]);

      return NextResponse.json({
        history: statusHistory.rows,
        routingHistory: routingHistory.rows,
        assignmentHistory: assignmentHistory.rows,
        obstacleHistory: obstacleHistory.rows.map((row) => ({
          id: row.id,
          reportId: row.report_id,
          staffId: row.staff_id,
          staffName: row.staff_name,
          category: row.category,
          reason: row.reason,
          photos: Array.isArray(row.photos) ? row.photos : [],
          status: row.status,
          resolutionNotes: row.resolution_notes,
          resolvedAt: row.resolved_at,
          createdAt: row.created_at,
        })),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const completionFor = searchParams.get('completionFor');
    if (completionFor) {
      const completion = await dbQuery<{
        completion_evidence: string[] | null;
        completion_notes: string | null;
        completion_submitted_at: string | null;
        completion_submitted_by: string | null;
        submitted_by_name: string | null;
      }>(
        `SELECT r.completion_evidence, r.completion_notes, r.completion_submitted_at,
                r.completion_submitted_by, submitted_by.name AS submitted_by_name
         FROM reports r
         LEFT JOIN users submitted_by ON submitted_by.id = r.completion_submitted_by
         WHERE r.id = $1 AND r.assigned_agency = $2 AND r.forwarded_at IS NOT NULL`,
        [completionFor, agencyAdmin.agency_name],
      );
      if (!completion.rows[0]) {
        return NextResponse.json({ error: 'Laporan tidak ditemukan atau tidak diteruskan ke instansi ini.' }, { status: 404 });
      }

      return NextResponse.json({
        completionEvidence: Array.isArray(completion.rows[0].completion_evidence) ? completion.rows[0].completion_evidence : [],
        completionNotes: completion.rows[0].completion_notes,
        completionSubmittedAt: completion.rows[0].completion_submitted_at,
        completionSubmittedBy: completion.rows[0].submitted_by_name,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const [reportsResult, summaryResult, staffResult] = await Promise.all([
      dbQuery<AgencyReportRow>(
        `SELECT r.id, r.ticket_number, r.title, r.category, r.location, r.coordinates,
                r.date, r.status, r.urgency, r.description, r.images, r.reporter_name,
                r.is_anonymous, r.assigned_agency, r.assigned_region, r.assigned_staff_id,
                assigned_staff.name AS assigned_staff_name, r.due_at, r.forwarded_at,
                r.agency_response, r.agency_response_reason, r.agency_responded_at,
                r.created_at, r.completion_evidence, r.completion_notes, r.staff_work_status,
                r.completion_submitted_at, u.name AS completion_submitted_by,
                r.staff_coordinates, r.staff_location_updated_at
         FROM reports r
         LEFT JOIN users u ON u.id = r.completion_submitted_by
         LEFT JOIN users assigned_staff ON assigned_staff.id = r.assigned_staff_id
         WHERE r.assigned_agency = $1 AND r.forwarded_at IS NOT NULL
         ORDER BY r.forwarded_at DESC, r.created_at DESC`,
        [agencyAdmin.agency_name],
      ),
      dbQuery<{ received: string; awaiting_response: string; processing: string; completed: string }>(
        `SELECT COUNT(*)::text AS received,
                COUNT(*) FILTER (WHERE agency_response = 'Menunggu')::text AS awaiting_response,
                COUNT(*) FILTER (WHERE status = 'Diproses' AND agency_response = 'Diterima')::text AS processing,
                COUNT(*) FILTER (WHERE status = 'Selesai')::text AS completed
         FROM reports
         WHERE assigned_agency = $1 AND forwarded_at IS NOT NULL`,
        [agencyAdmin.agency_name],
      ),
      dbQuery<{ id: string; name: string }>(
        `SELECT id, name
         FROM users
         WHERE agency_id = $1 AND role = 'Petugas' AND is_active = true
         ORDER BY name ASC`,
        [agencyAdmin.agency_id],
      ),
    ]);

    const reportIds = reportsResult.rows.map((r) => r.id);
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
      const obstacles = await dbQuery<ReportObstacleRow>(
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
          staffName: obs.staff_name ?? undefined,
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

    const counts = summaryResult.rows[0];
    return NextResponse.json({
      agency: { id: agencyAdmin.agency_id, name: agencyAdmin.agency_name },
      user: { id: agencyAdmin.id, name: agencyAdmin.name, email: agencyAdmin.email },
      staff: staffResult.rows,
      summary: {
        received: Number(counts?.received ?? 0),
        processing: Number(counts?.processing ?? 0),
        completed: Number(counts?.completed ?? 0),
        awaitingResponse: Number(counts?.awaiting_response ?? 0),
      },
      reports: reportsResult.rows.map((report) => ({
        id: report.id,
        ticketNumber: report.ticket_number,
        title: report.title,
        category: report.category,
        location: report.location,
        coordinates: report.coordinates,
        status: report.status,
        urgency: report.urgency,
        date: report.date,
        description: report.description,
        images: Array.isArray(report.images) ? report.images : [],
        reporterName: report.is_anonymous ? 'Warga Anonim' : report.reporter_name ?? 'Tidak diketahui',
        assignedAgency: report.assigned_agency,
        assignedRegion: report.assigned_region,
        assignedStaffId: report.assigned_staff_id,
        assignedStaffName: report.assigned_staff_name,
        dueAt: report.due_at,
        forwardedAt: report.forwarded_at,
        agencyResponse: report.agency_response,
        agencyResponseReason: report.agency_response_reason,
        agencyRespondedAt: report.agency_responded_at,
        createdAt: report.created_at,
        completionEvidence: Array.isArray(report.completion_evidence) ? report.completion_evidence : [],
        completionNotes: report.completion_notes,
        completionSubmittedAt: report.completion_submitted_at,
        completionSubmittedBy: report.completion_submitted_by,
        staffWorkStatus: report.staff_work_status,
        staffCoordinates: report.staff_coordinates,
        staffLocationUpdatedAt: report.staff_location_updated_at,
        obstacles: obstaclesByReportId[report.id] || [],
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get agency reports error:', error);
    return NextResponse.json({ error: 'Gagal memuat ringkasan laporan instansi.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const agencyAdmin = await getAgencySession();
    if (!agencyAdmin) {
      return NextResponse.json({ error: 'Masuk dengan akun Admin Instansi untuk melanjutkan.' }, { status: 401 });
    }

    const payload = await request.json();
    const reportId = String(payload?.reportId ?? '').trim();
    const action = payload?.action;
    const reason = String(payload?.reason ?? '').trim();
    if (!reportId || !['accept', 'reject', 'assign', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'Permintaan keputusan penugasan tidak valid.' }, { status: 400 });
    }
    if (action === 'complete') {
      const completed = await dbQuery<{ id: string }>(
        `UPDATE reports
         SET status = 'Selesai', staff_work_status = 'Selesai',
             staff_work_updated_at = NOW(), staff_work_updated_by = $3
         WHERE id = $1 AND assigned_agency = $2 AND forwarded_at IS NOT NULL
           AND agency_response = 'Diterima' AND status = 'Diproses'
           AND completion_submitted_at IS NOT NULL
           AND completion_submitted_by = assigned_staff_id
           AND staff_work_status = 'Bukti Diajukan'
           AND jsonb_typeof(completion_evidence) = 'array'
           AND jsonb_array_length(completion_evidence) > 0
         RETURNING id`,
        [reportId, agencyAdmin.agency_name, agencyAdmin.id],
      );
      if (!completed.rows[0]) {
        return NextResponse.json({ error: 'Bukti belum diajukan atau laporan tidak dapat diselesaikan.' }, { status: 409 });
      }
      return NextResponse.json({ report: { id: completed.rows[0].id, status: 'Selesai' } });
    }
    if (action === 'assign') {
      const staffId = String(payload?.staffId ?? '').trim();
      const dueAt = String(payload?.dueAt ?? '').trim();
      const dueDate = new Date(dueAt);
      if (!staffId || !dueAt || Number.isNaN(dueDate.getTime()) || dueDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Pilih petugas dan tenggat waktu yang masih akan datang.' }, { status: 400 });
      }

      const staff = await dbQuery<{ id: string }>(
        `SELECT id FROM users
         WHERE id = $1 AND agency_id = $2 AND role = 'Petugas' AND is_active = true`,
        [staffId, agencyAdmin.agency_id],
      );
      if (!staff.rows[0]) {
        return NextResponse.json({ error: 'Petugas tidak aktif atau bukan anggota instansi ini.' }, { status: 400 });
      }

      const assignment = await dbQuery<{
        id: string;
        assigned_staff_id: string;
        assigned_staff_name: string;
        due_at: string;
        changed: boolean;
      }>(
        `WITH staff AS MATERIALIZED (
           SELECT id
           FROM users
           WHERE id = $3 AND agency_id = $6 AND role = 'Petugas' AND is_active = true
           FOR SHARE
         ), existing AS MATERIALIZED (
           SELECT id, ticket_number, assigned_staff_id, due_at
           FROM reports
           WHERE id = $1 AND assigned_agency = $2 AND forwarded_at IS NOT NULL
             AND status = 'Diproses' AND agency_response = 'Diterima'
             AND completion_submitted_at IS NULL
             AND EXISTS (SELECT 1 FROM staff)
          FOR UPDATE
         ), updated AS (
           UPDATE reports report
           SET assigned_staff_id = $3, due_at = $4
           FROM existing
           WHERE report.id = existing.id
           RETURNING report.id, report.assigned_staff_id, report.due_at
         ), changes AS (
           SELECT updated.id, existing.ticket_number,
                  existing.assigned_staff_id AS previous_staff_id,
                  existing.due_at AS previous_due_at,
                  updated.assigned_staff_id, updated.due_at
           FROM updated
           JOIN existing ON existing.id = updated.id
         ), history AS (
           INSERT INTO report_staff_assignment_history
             (report_id, previous_staff_id, assigned_staff_id, previous_due_at, due_at, changed_by)
           SELECT id, previous_staff_id, assigned_staff_id, previous_due_at, due_at, $5
           FROM changes
           WHERE previous_staff_id IS DISTINCT FROM assigned_staff_id
              OR previous_due_at IS DISTINCT FROM due_at
           RETURNING report_id
         ), notifications AS (
           INSERT INTO staff_notifications (staff_id, report_id, kind, title, message)
           SELECT assigned_staff_id, id,
                  CASE WHEN previous_staff_id IS NULL THEN 'new_assignment' ELSE 'assignment_changed' END,
                  CASE WHEN previous_staff_id IS NULL THEN 'Tugas baru ditetapkan' ELSE 'Perubahan penugasan' END,
                  'Laporan ' || ticket_number || ' ditugaskan kepada Anda. Tenggat: ' || due_at::text || '.'
           FROM changes
           WHERE previous_staff_id IS DISTINCT FROM assigned_staff_id
              OR previous_due_at IS DISTINCT FROM due_at
           UNION ALL
           SELECT previous_staff_id, id, 'assignment_changed', 'Perubahan penugasan',
                  'Laporan ' || ticket_number || ' dialihkan kepada petugas lain.'
           FROM changes
           WHERE previous_staff_id IS NOT NULL
             AND previous_staff_id IS DISTINCT FROM assigned_staff_id
           RETURNING id
         )
         SELECT changes.id, changes.assigned_staff_id, assigned_staff.name AS assigned_staff_name,
                changes.due_at, EXISTS (SELECT 1 FROM history) AS changed
         FROM changes
         JOIN users assigned_staff ON assigned_staff.id = changes.assigned_staff_id`,
        [reportId, agencyAdmin.agency_name, staffId, dueDate.toISOString(), agencyAdmin.id, agencyAdmin.agency_id],
      );
      if (!assignment.rows[0]) {
        return NextResponse.json({ error: 'Laporan tidak ditemukan, belum diterima, atau tidak dapat ditugaskan.' }, { status: 409 });
      }
      return NextResponse.json({ report: assignment.rows[0] });
    }
    if (action === 'reject' && (reason.length < 5 || reason.length > 1000)) {
      return NextResponse.json({ error: 'Alasan pengembalian wajib diisi (5 sampai 1.000 karakter).' }, { status: 400 });
    }

    if (action === 'accept') {
      const result = await dbQuery<{ id: string; agency_response: string; agency_responded_at: string }>(
        `WITH updated AS (
           UPDATE reports
           SET agency_response = 'Diterima', agency_response_reason = NULL,
               agency_responded_at = NOW(), agency_responded_by = $3
           WHERE id = $1 AND assigned_agency = $2 AND forwarded_at IS NOT NULL
             AND status = 'Diproses' AND agency_response = 'Menunggu'
           RETURNING id, assigned_agency, assigned_region, agency_responded_at
         ), routing AS (
           INSERT INTO report_routing_history (id, report_id, action, agency, region, performed_by, details)
           SELECT $4, id, 'Diterima', assigned_agency, assigned_region, $3,
                  'Penugasan diterima oleh Admin Instansi'
           FROM updated
           RETURNING report_id
         ), notifications AS (
           INSERT INTO admin_notifications (admin_id, report_id, kind, title, message)
           SELECT u.id, updated.id, 'agency_accepted', 'Penugasan diterima instansi',
                  'Instansi ' || updated.assigned_agency || ' menerima penugasan untuk laporan ' || r.ticket_number || '.'
           FROM updated
           JOIN reports r ON r.id = updated.id
           CROSS JOIN users u
           WHERE u.role = 'Admin' AND u.is_active = true
           RETURNING id
         )
         SELECT updated.id, 'Diterima' AS agency_response, updated.agency_responded_at
         FROM updated JOIN routing ON routing.report_id = updated.id`,
        [reportId, agencyAdmin.agency_name, agencyAdmin.id, crypto.randomUUID()],
      );
      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Penugasan tidak ditemukan, bukan milik instansi ini, atau sudah diputuskan.' }, { status: 409 });
      }
      return NextResponse.json({ report: result.rows[0] });
    }

    const result = await dbQuery<{ id: string }>(
      `WITH current AS MATERIALIZED (
         SELECT id, ticket_number, assigned_agency, assigned_region
         FROM reports
         WHERE id = $1 AND assigned_agency = $2 AND forwarded_at IS NOT NULL
           AND status = 'Diproses' AND agency_response = 'Menunggu'
       ), updated AS (
         UPDATE reports report
         SET assigned_agency = NULL, assigned_region = NULL,
             forwarded_at = NULL, forwarded_by = NULL,
             agency_response = 'Dikembalikan', agency_response_reason = $3,
             agency_responded_at = NOW(), agency_responded_by = $4
         FROM current
         WHERE report.id = current.id AND report.assigned_agency = $2
           AND report.forwarded_at IS NOT NULL AND report.status = 'Diproses'
           AND report.agency_response = 'Menunggu'
         RETURNING report.id
       ), routing AS (
         INSERT INTO report_routing_history (id, report_id, action, agency, region, performed_by, details)
         SELECT $5, current.id, 'Dikembalikan', current.assigned_agency, current.assigned_region, $4,
                'Alasan pengembalian: ' || $3
         FROM current JOIN updated USING (id)
         RETURNING report_id
       ), notifications AS (
         INSERT INTO admin_notifications (admin_id, report_id, kind, title, message)
         SELECT u.id, updated.id, 'agency_returned', 'Penugasan dikembalikan instansi',
                'Instansi ' || current.assigned_agency || ' mengembalikan laporan ' || current.ticket_number || ': ' || $3
         FROM updated
         JOIN current ON current.id = updated.id
         JOIN routing ON routing.report_id = updated.id
         CROSS JOIN users u
         WHERE u.role = 'Admin' AND u.is_active = true
         RETURNING id
       )
       SELECT updated.id, (SELECT COUNT(*)::text FROM notifications) AS notifications_created
       FROM updated JOIN routing ON routing.report_id = updated.id`,
      [reportId, agencyAdmin.agency_name, reason, agencyAdmin.id, crypto.randomUUID()],
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Penugasan tidak ditemukan, bukan milik instansi ini, atau sudah diputuskan.' }, { status: 409 });
    }
    return NextResponse.json({ report: { id: result.rows[0].id, agencyResponse: 'Dikembalikan' } });
  } catch (error) {
    console.error('Decide agency assignment error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan keputusan penugasan.' }, { status: 500 });
  }
}
