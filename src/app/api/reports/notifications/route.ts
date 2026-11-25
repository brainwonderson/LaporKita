import { NextResponse } from 'next/server';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';
import { getResidentSession } from '@/lib/resident-auth';

type ReportStatusNotificationRow = {
  id: string;
  report_id: string;
  ticket_number: string;
  title: string;
  previous_status: string;
  new_status: string;
  note: string;
  changed_at: string;
};

export async function GET() {
  try {
    const resident = await getResidentSession();
    if (!resident) return NextResponse.json({ error: 'Masuk dengan akun Warga untuk melanjutkan.' }, { status: 401 });

    await ensureDatabaseSchema();

    const notifications = await dbQuery<ReportStatusNotificationRow>(
      `SELECT history.id::text, report.id AS report_id, report.ticket_number, report.title,
              history.previous_status, history.new_status, history.note, history.changed_at
       FROM report_status_history history
       JOIN reports report ON report.id = history.report_id
       WHERE report.reporter_id = $1
         AND history.previous_status IS NOT NULL
       ORDER BY history.changed_at DESC, history.id DESC
       LIMIT 50`,
      [resident.id],
    );

    return NextResponse.json(
      { notifications: notifications.rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Get resident report notifications error:', error);
    return NextResponse.json({ error: 'Gagal memuat notifikasi perubahan status.' }, { status: 500 });
  }
}
