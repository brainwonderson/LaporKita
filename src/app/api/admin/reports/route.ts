import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

type AdminReportRow = {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  agency: string;
  location: string;
  date: string;
  status: string;
  urgency: string;
  description: string;
  coordinates: { lat?: number; lng?: number; displayAddress?: string } | null;
  images: string[] | null;
  reporter_name: string | null;
  is_anonymous: boolean;
  rejection_reason: string | null;
  assigned_agency: string | null;
  assigned_region: string | null;
  forwarded_at: string | null;
  completion_evidence: string[] | null;
  completion_notes: string | null;
  completion_submitted_at: string | null;
  completion_submitted_by: string | null;
  created_at: string;
};

type ReportHistoryRow = {
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

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const historyFor = searchParams.get('historyFor');
    if (historyFor) {
      const reportExists = await dbQuery<{ id: string }>(
        'SELECT id FROM reports WHERE id = $1',
        [historyFor],
      );
      if (reportExists.rowCount === 0) {
        return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
      }

      const history = await dbQuery<ReportHistoryRow>(
        `SELECT id::text, previous_status, new_status, note, changed_at
         FROM report_status_history
         WHERE report_id = $1
         ORDER BY changed_at ASC, id ASC`,
        [historyFor],
      );
      return NextResponse.json({ history: history.rows }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const completionFor = searchParams.get('completionFor');
    if (completionFor) {
      const completion = await dbQuery<{
        completion_evidence: string[] | null;
        completion_notes: string | null;
        completion_submitted_at: string | null;
        submitted_by: string | null;
      }>(
        `SELECT r.completion_evidence, r.completion_notes, r.completion_submitted_at, u.name AS submitted_by
         FROM reports r
         LEFT JOIN users u ON u.id = r.completion_submitted_by
         WHERE r.id = $1`,
        [completionFor],
      );
      if (!completion.rows[0]) return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
      return NextResponse.json({
        completionEvidence: Array.isArray(completion.rows[0].completion_evidence) ? completion.rows[0].completion_evidence : [],
        completionNotes: completion.rows[0].completion_notes,
        completionSubmittedAt: completion.rows[0].completion_submitted_at,
        completionSubmittedBy: completion.rows[0].submitted_by,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const routingFor = searchParams.get('routingFor');
    if (routingFor) {
      const exists = await dbQuery<{ id: string }>('SELECT id FROM reports WHERE id = $1', [routingFor]);
      if (exists.rowCount === 0) {
        return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
      }
      const history = await dbQuery<ReportRoutingHistoryRow>(
        `SELECT id, action, agency, region, details, created_at
         FROM report_routing_history
         WHERE report_id = $1
         ORDER BY created_at ASC, id ASC`,
        [routingFor],
      );
      return NextResponse.json({ routingHistory: history.rows }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const result = await dbQuery<AdminReportRow>(
      `SELECT id, ticket_number, title, category, agency, location, date, status, urgency,
              description, coordinates, images, reporter_name, is_anonymous, rejection_reason,
              assigned_agency, assigned_region, forwarded_at, created_at
       FROM reports
       ORDER BY created_at DESC`,
    );

    return NextResponse.json(
      {
        user: admin,
        reports: result.rows.map((report) => ({
          id: report.id,
          ticketNumber: report.ticket_number,
          title: report.title,
          category: report.category,
          agency: report.agency,
          location: report.location,
          date: report.date,
          assignedAgency: report.assigned_agency,
          assignedRegion: report.assigned_region,
          forwardedAt: report.forwarded_at,
          completionEvidence: [],
          status: report.status,
          urgency: report.urgency,
          description: report.description,
          coordinates: report.coordinates,
          images: Array.isArray(report.images) ? report.images : [],
          reporterName: report.is_anonymous ? 'Warga Anonim' : report.reporter_name ?? 'Tidak diketahui',
          rejectionReason: report.rejection_reason,
          createdAt: report.created_at,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Get admin reports error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar laporan.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();

    const payload = await request.json();
    const reportId = String(payload?.reportId ?? '').trim();
    const action = payload?.action;
    const rejectionReason = String(payload?.rejectionReason ?? '').trim();

    if (!reportId || !['approve', 'reject', 'assign', 'forward', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'Permintaan keputusan laporan tidak valid.' }, { status: 400 });
    }

    if (action === 'assign') {
      const agency = String(payload?.agency ?? '').trim();
      const region = String(payload?.region ?? '').trim();
      const activeRegion = await dbQuery<{ id: string }>(
        `SELECT r.id
         FROM report_regions r
         JOIN report_agencies a ON a.id = r.agency_id
         WHERE a.name = $1 AND a.is_active = true
           AND r.name = $2 AND r.is_active = true`,
        [agency, region],
      );
      if (!activeRegion.rows[0]) {
        return NextResponse.json({ error: 'Pilih wilayah aktif yang terdaftar pada instansi tujuan.' }, { status: 400 });
      }

      const assignment = await dbQuery<{ report_id: string; agency: string; region: string }>(
        `WITH updated AS (
           UPDATE reports
           SET assigned_agency = $2, assigned_region = $3
           WHERE id = $1 AND status = 'Diproses' AND forwarded_at IS NULL
           RETURNING id, assigned_agency, assigned_region
         ), routing AS (
           INSERT INTO report_routing_history (id, report_id, action, agency, region, performed_by, details)
           SELECT $4, id, 'Ditetapkan', assigned_agency, assigned_region, $5, 'Instansi dan wilayah tujuan ditetapkan Admin'
           FROM updated
           RETURNING report_id, agency, region
         ), activity AS (
           INSERT INTO admin_activity_log (admin_id, report_id, action, details)
           SELECT $5, report_id, 'assignment_changed', 'Penugasan ditetapkan ke ' || agency || ' untuk wilayah ' || region
           FROM routing
           RETURNING report_id
         )
         SELECT routing.report_id, routing.agency, routing.region
         FROM routing JOIN activity USING (report_id)`,
        [reportId, agency, region, crypto.randomUUID(), admin.id],
      );

      if (!assignment.rows[0]) return await respondToInvalidRoutingAction(reportId, 'menetapkan instansi');

      return NextResponse.json({
        report: {
          id: assignment.rows[0].report_id,
          assignedAgency: assignment.rows[0].agency,
          assignedRegion: assignment.rows[0].region,
          forwardedAt: null,
        },
      });
    }

    if (action === 'forward') {
      const assignedRegion = await dbQuery<{ id: string }>(
        `SELECT r.id
         FROM reports report
         JOIN report_agencies a ON a.name = report.assigned_agency AND a.is_active = true
         JOIN report_regions r ON r.agency_id = a.id
           AND r.name = report.assigned_region AND r.is_active = true
         WHERE report.id = $1`,
        [reportId],
      );
      if (!assignedRegion.rows[0]) {
        return NextResponse.json({ error: 'Wilayah penugasan tidak aktif atau belum terdaftar. Tetapkan ulang wilayah sebelum meneruskan laporan.' }, { status: 409 });
      }

      const forwarding = await dbQuery<{
        report_id: string;
        agency: string;
        region: string;
        forwarded_at: string;
      }>(
        `WITH updated AS (
           UPDATE reports
             SET forwarded_at = NOW(), forwarded_by = $2,
                 agency_response = 'Menunggu', agency_response_reason = NULL,
                 agency_responded_at = NULL, agency_responded_by = NULL
           WHERE id = $1 AND status = 'Diproses'
             AND assigned_agency IS NOT NULL AND assigned_region IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM report_agencies a
               WHERE a.name = reports.assigned_agency AND a.is_active = true
             )
             AND forwarded_at IS NULL
           RETURNING id, assigned_agency, assigned_region, forwarded_at
         ), routing AS (
           INSERT INTO report_routing_history (id, report_id, action, agency, region, performed_by, details)
           SELECT $3, id, 'Diteruskan', assigned_agency, assigned_region, $2,
                  'Laporan diteruskan ke ' || assigned_agency || ' untuk wilayah ' || assigned_region
           FROM updated
           RETURNING report_id, agency, region
         ), activity AS (
           INSERT INTO admin_activity_log (admin_id, report_id, action, details)
           SELECT $2, report_id, 'assignment_forwarded',
                  'Laporan diteruskan ke ' || agency || ' untuk wilayah ' || region
           FROM routing
           RETURNING report_id
         )
         SELECT routing.report_id, routing.agency, routing.region, updated.forwarded_at
         FROM routing
         JOIN updated ON updated.id = routing.report_id
         JOIN activity USING (report_id)`,
        [reportId, admin.id, crypto.randomUUID()],
      );

      if (!forwarding.rows[0]) return await respondToInvalidRoutingAction(reportId, 'meneruskan laporan');

      return NextResponse.json({
        report: {
          id: forwarding.rows[0].report_id,
          assignedAgency: forwarding.rows[0].agency,
          assignedRegion: forwarding.rows[0].region,
          forwardedAt: forwarding.rows[0].forwarded_at,
        },
      });
    }

    if (action === 'complete') {
      const completion = await dbQuery<{ id: string; status: string }>(
        `WITH updated AS (
           UPDATE reports
           SET status = 'Selesai'
           WHERE id = $1 AND status = 'Diproses' AND forwarded_at IS NOT NULL
             AND agency_response = 'Diterima'
             AND completion_evidence IS NOT NULL
             AND jsonb_array_length(
               CASE WHEN jsonb_typeof(completion_evidence) = 'array' THEN completion_evidence ELSE '[]'::jsonb END
             ) > 0
           RETURNING id, status, ticket_number
         ), activity AS (
           INSERT INTO admin_activity_log (admin_id, report_id, action, details)
           SELECT $2, id, 'report_completed', 'Admin menyetujui bukti dan menutup laporan ' || ticket_number
           FROM updated
           RETURNING report_id
         )
         SELECT updated.id, updated.status
         FROM updated JOIN activity ON activity.report_id = updated.id`,
        [reportId, admin.id],
      );

      if (!completion.rows[0]) {
        const existing = await dbQuery<{ status: string; forwarded_at: string | null; completion_evidence: string[] | null; agency_response: string }>(
          'SELECT status, forwarded_at, completion_evidence, agency_response FROM reports WHERE id = $1',
          [reportId],
        );
        if (existing.rowCount === 0) {
          return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
        }
        if (existing.rows[0].status !== 'Diproses') {
          return NextResponse.json(
            { error: `Laporan tidak dapat diselesaikan karena statusnya sudah ${existing.rows[0].status}.` },
            { status: 409 },
          );
        }
        if (!existing.rows[0].forwarded_at) {
          return NextResponse.json({ error: 'Teruskan laporan ke instansi sebelum menandainya selesai.' }, { status: 409 });
        }
        if (existing.rows[0].agency_response !== 'Diterima') {
          return NextResponse.json({ error: 'Instansi harus menerima penugasan sebelum laporan dapat diselesaikan.' }, { status: 409 });
        }
        if (!Array.isArray(existing.rows[0].completion_evidence) || existing.rows[0].completion_evidence.length === 0) {
          return NextResponse.json({ error: 'Petugas harus mengirim foto bukti penyelesaian sebelum laporan dapat ditutup.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Laporan tidak dapat ditandai selesai.' }, { status: 409 });
      }

      return NextResponse.json({ report: completion.rows[0] });
    }

    if (action === 'reject' && (rejectionReason.length < 5 || rejectionReason.length > 1000)) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi (5 sampai 1.000 karakter).' }, { status: 400 });
    }

    const nextStatus = action === 'approve' ? 'Diproses' : 'Ditolak';
    const update = await dbQuery<{ id: string; status: string; rejection_reason: string | null }>(
      `WITH updated AS (
         UPDATE reports
         SET status = $1, rejection_reason = $2
         WHERE id = $3 AND status = 'Menunggu'
         RETURNING id, status, rejection_reason, ticket_number
       ), activity AS (
         INSERT INTO admin_activity_log (admin_id, report_id, action, details)
         SELECT $4, id,
                CASE WHEN status = 'Diproses' THEN 'report_verified' ELSE 'report_rejected' END,
                CASE WHEN status = 'Diproses'
                  THEN 'Admin memverifikasi laporan ' || ticket_number
                  ELSE 'Admin menolak laporan ' || ticket_number || ': ' || COALESCE(rejection_reason, '')
                END
         FROM updated
         RETURNING report_id
       )
       SELECT updated.id, updated.status, updated.rejection_reason
       FROM updated JOIN activity ON activity.report_id = updated.id`,
      [nextStatus, action === 'reject' ? rejectionReason : null, reportId, admin.id],
    );

    if (!update.rows[0]) {
      const existing = await dbQuery<{ status: string }>('SELECT status FROM reports WHERE id = $1', [reportId]);
      if (existing.rowCount === 0) {
        return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json(
        { error: `Laporan tidak dapat diputuskan karena statusnya sudah ${existing.rows[0].status}.` },
        { status: 409 },
      );
    }

    return NextResponse.json({
      report: {
        id: update.rows[0].id,
        status: update.rows[0].status,
        rejectionReason: update.rows[0].rejection_reason,
      },
    });
  } catch (error) {
    console.error('Decide admin report error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan keputusan laporan.' }, { status: 500 });
  }
}

async function respondToInvalidRoutingAction(reportId: string, action: string) {
  const existing = await dbQuery<{
    status: string;
    assigned_agency: string | null;
    assigned_region: string | null;
    forwarded_at: string | null;
  }>(
    'SELECT status, assigned_agency, assigned_region, forwarded_at FROM reports WHERE id = $1',
    [reportId],
  );

  if (existing.rowCount === 0) {
    return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
  }

  const report = existing.rows[0];
  if (report.status !== 'Diproses') {
    return NextResponse.json({ error: `Laporan harus disetujui terlebih dahulu; status saat ini ${report.status}.` }, { status: 409 });
  }
  if (report.forwarded_at) {
    return NextResponse.json({ error: 'Laporan sudah diteruskan ke instansi.' }, { status: 409 });
  }
  if (action === 'meneruskan laporan' && (!report.assigned_agency || !report.assigned_region)) {
    return NextResponse.json({ error: 'Tetapkan instansi dan wilayah sebelum meneruskan laporan.' }, { status: 409 });
  }

  return NextResponse.json({ error: `Tidak dapat ${action}.` }, { status: 409 });
}