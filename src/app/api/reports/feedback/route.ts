import { NextResponse } from 'next/server';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

const ABUSE_REASONS = ['spam', 'penyalahgunaan', 'konten_tidak_pantas', 'palsu', 'duplikat', 'tidak_relevan', 'lainnya'] as const;

type ReportAccessRow = {
  status: string;
  reporter_id: string | null;
  user_id: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const userId = searchParams.get('userId');

    if (!reportId || !userId) {
      return NextResponse.json({ error: 'ID laporan dan pengguna wajib diisi.' }, { status: 400 });
    }

    await ensureDatabaseSchema();

    const access = await dbQuery<ReportAccessRow>(
      `SELECT r.status, r.reporter_id, u.id AS user_id
       FROM reports r
       LEFT JOIN users u ON u.id = $2
       WHERE r.id = $1`,
      [reportId, userId],
    );
    const report = access.rows[0];

    if (!report || !report.user_id) {
      return NextResponse.json({ error: 'Laporan atau akun tidak ditemukan.' }, { status: 404 });
    }

    const [feedbackResult, abuseResult] = await Promise.all([
      dbQuery<{ rating: number; feedback: string }>(
        'SELECT rating, feedback FROM report_feedback WHERE report_id = $1 AND user_id = $2',
        [reportId, userId],
      ),
      dbQuery<{ id: string }>(
        'SELECT id FROM report_abuse_reports WHERE report_id = $1 AND user_id = $2',
        [reportId, userId],
      ),
    ]);

    const isReporter = report.reporter_id === userId;
    const isCompleted = report.status === 'Selesai';

    return NextResponse.json({
      feedback: isReporter && isCompleted ? feedbackResult.rows[0] ?? null : null,
      abuseSubmitted: abuseResult.rowCount !== 0,
      canGiveFeedback: isReporter && isCompleted,
    });
  } catch (error) {
    console.error('Get report feedback error:', error);
    return NextResponse.json({ error: 'Gagal memuat feedback laporan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const reportId = String(payload?.reportId ?? '').trim();
    const userId = String(payload?.userId ?? '').trim();
    const action = payload?.action;

    if (!reportId || !userId) {
      return NextResponse.json({ error: 'ID laporan dan pengguna wajib diisi.' }, { status: 400 });
    }

    await ensureDatabaseSchema();

    const access = await dbQuery<ReportAccessRow>(
      `SELECT r.status, r.reporter_id, u.id AS user_id
       FROM reports r
       LEFT JOIN users u ON u.id = $2
       WHERE r.id = $1`,
      [reportId, userId],
    );
    const report = access.rows[0];

    if (!report || !report.user_id) {
      return NextResponse.json({ error: 'Laporan atau akun tidak ditemukan.' }, { status: 404 });
    }

    if (action === 'abuse') {
      const reason = String(payload?.reason ?? '');
      const details = String(payload?.details ?? '').trim();

      if (!ABUSE_REASONS.includes(reason as (typeof ABUSE_REASONS)[number])) {
        return NextResponse.json({ error: 'Pilih alasan pelaporan yang valid.' }, { status: 400 });
      }
      if (details.length > 1000) {
        return NextResponse.json({ error: 'Keterangan maksimal 1.000 karakter.' }, { status: 400 });
      }
      if (report.reporter_id === userId) {
        return NextResponse.json({ error: 'Anda tidak dapat melaporkan penyalahgunaan pada laporan sendiri.' }, { status: 403 });
      }

      const inserted = await dbQuery<{ id: string }>(
        `INSERT INTO report_abuse_reports (id, report_id, user_id, reason, details)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (report_id, user_id) DO NOTHING
         RETURNING id`,
        [crypto.randomUUID(), reportId, userId, reason, details],
      );

      if (inserted.rowCount === 0) {
        return NextResponse.json({ error: 'Anda sudah melaporkan laporan ini.' }, { status: 409 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'feedback') {
      const rating = Number(payload?.rating);
      const feedback = String(payload?.feedback ?? '').trim();

      if (report.status !== 'Selesai') {
        return NextResponse.json({ error: 'Feedback hanya tersedia setelah laporan selesai.' }, { status: 400 });
      }
      if (report.reporter_id !== userId) {
        return NextResponse.json({ error: 'Hanya pelapor yang dapat memberikan feedback.' }, { status: 403 });
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating harus antara 1 sampai 5.' }, { status: 400 });
      }
      if (feedback.length < 3 || feedback.length > 1000) {
        return NextResponse.json({ error: 'Feedback harus 3 sampai 1.000 karakter.' }, { status: 400 });
      }

      await dbQuery(
        `INSERT INTO report_feedback (id, report_id, user_id, rating, feedback)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (report_id, user_id)
         DO UPDATE SET rating = EXCLUDED.rating, feedback = EXCLUDED.feedback, updated_at = NOW()`,
        [crypto.randomUUID(), reportId, userId, rating, feedback],
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Jenis tindakan tidak dikenal.' }, { status: 400 });
  } catch (error) {
    console.error('Save report feedback error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan laporan penyalahgunaan atau feedback.' }, { status: 500 });
  }
}