import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

type AbuseReportRow = {
  id: string;
  reason: string;
  details: string | null;
  review_status: string;
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
  reviewer_name: string | null;
  reporter_name: string;
  reporter_email: string;
  report_id: string;
  ticket_number: string;
  title: string;
  category: string;
  location: string;
  description: string;
  status: string;
  images: string[] | null;
};

const REVIEW_STATUSES = ['dismissed', 'action_required'] as const;

export async function GET() {
  try {
    if (!await getAdminSession()) {
      return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    }
    await ensureDatabaseSchema();
    const result = await dbQuery<AbuseReportRow>(
      `SELECT ar.id, ar.reason, ar.details, ar.review_status, ar.review_note,
              ar.created_at, ar.reviewed_at, reviewer.name AS reviewer_name,
              reporter.name AS reporter_name, reporter.email AS reporter_email,
              r.id AS report_id, r.ticket_number, r.title, r.category, r.location,
              r.description, r.status, r.images
       FROM report_abuse_reports ar
       JOIN reports r ON r.id = ar.report_id
       JOIN users reporter ON reporter.id = ar.user_id
       LEFT JOIN users reviewer ON reviewer.id = ar.reviewed_by
       ORDER BY CASE WHEN ar.review_status = 'pending' THEN 0 ELSE 1 END,
                ar.created_at ASC`,
    );
    return NextResponse.json({
      abuseReports: result.rows.map((row) => ({
        id: row.id,
        reason: row.reason,
        details: row.details ?? '',
        reviewStatus: row.review_status,
        reviewNote: row.review_note,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewerName: row.reviewer_name,
        reporterName: row.reporter_name,
        reporterEmail: row.reporter_email,
        report: {
          id: row.report_id,
          ticketNumber: row.ticket_number,
          title: row.title,
          category: row.category,
          location: row.location,
          description: row.description,
          status: row.status,
          images: Array.isArray(row.images) ? row.images : [],
        },
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get admin abuse reports error:', error);
    return NextResponse.json({ error: 'Gagal memuat antrean peninjauan konten.' }, { status: 500 });
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
    const id = String(payload?.id ?? '').trim();
    const status = payload?.reviewStatus;
    const reviewNote = String(payload?.reviewNote ?? '').trim();

    if (!id || !REVIEW_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Keputusan peninjauan tidak valid.' }, { status: 400 });
    }
    if (reviewNote.length > 1000) {
      return NextResponse.json({ error: 'Catatan peninjauan maksimal 1.000 karakter.' }, { status: 400 });
    }

    const result = await dbQuery<{ id: string; review_status: string; reviewed_at: string }>(
      `WITH updated AS (
         UPDATE report_abuse_reports
         SET review_status = $1, review_note = $2, reviewed_by = $3, reviewed_at = NOW()
         WHERE id = $4
         RETURNING id, review_status, reviewed_at, report_id, reason
       ), activity AS (
         INSERT INTO admin_activity_log (admin_id, report_id, action, details)
         SELECT $3, report_id, 'abuse_report_reviewed',
                CASE WHEN review_status = 'dismissed'
                  THEN 'Aduan konten ditinjau sebagai tidak memerlukan tindakan (' || reason || ')'
                  ELSE 'Aduan konten ditandai perlu tindak lanjut (' || reason || ')'
                END
         FROM updated
         RETURNING report_id
       )
       SELECT updated.id, updated.review_status, updated.reviewed_at
       FROM updated JOIN activity USING (report_id)`,
      [status, reviewNote, admin.id, id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Aduan konten tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      abuseReport: {
        id: result.rows[0].id,
        reviewStatus: result.rows[0].review_status,
        reviewNote,
        reviewedAt: result.rows[0].reviewed_at,
        reviewerName: admin.name,
      },
    });
  } catch (error) {
    console.error('Review admin abuse report error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan hasil peninjauan.' }, { status: 500 });
  }
}
