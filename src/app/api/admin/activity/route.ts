import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

type ActivityRow = {
  id: string;
  action: string;
  details: string;
  admin_name: string | null;
  ticket_number: string | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  report_id: string | null;
  kind: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  ticket_number: string | null;
};

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    await ensureDatabaseSchema();

    const [activityResult, notificationResult, countResult] = await Promise.all([
      dbQuery<ActivityRow>(
        `SELECT a.id::text, a.action, a.details, u.name AS admin_name,
                r.ticket_number, a.created_at
         FROM admin_activity_log a
         LEFT JOIN users u ON u.id = a.admin_id
         LEFT JOIN reports r ON r.id = a.report_id
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 50`,
      ),
      dbQuery<NotificationRow>(
        `SELECT n.id::text, n.report_id, n.kind, n.title, n.message,
                n.created_at, n.read_at, r.ticket_number
         FROM admin_notifications n
         LEFT JOIN reports r ON r.id = n.report_id
         WHERE n.admin_id = $1
         ORDER BY n.created_at DESC, n.id DESC
         LIMIT 50`,
        [admin.id],
      ),
      dbQuery<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM admin_notifications WHERE admin_id = $1 AND read_at IS NULL',
        [admin.id],
      ),
    ]);

    return NextResponse.json({
      activities: activityResult.rows.map((row) => ({
        id: row.id,
        action: row.action,
        details: row.details,
        adminName: row.admin_name || 'Admin',
        ticketNumber: row.ticket_number,
        createdAt: row.created_at,
      })),
      notifications: notificationResult.rows.map((row) => ({
        id: row.id,
        reportId: row.report_id,
        kind: row.kind,
        title: row.title,
        message: row.message,
        ticketNumber: row.ticket_number,
        createdAt: row.created_at,
        readAt: row.read_at,
      })),
      unreadCount: Number(countResult.rows[0]?.count ?? 0),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get admin activity error:', error);
    return NextResponse.json({ error: 'Gagal memuat aktivitas dan notifikasi admin.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Sesi admin tidak valid atau sudah berakhir.' }, { status: 401 });
    await ensureDatabaseSchema();

    const payload = await request.json();
    const notificationId = String(payload?.notificationId ?? '').trim();
    if (payload?.markAllRead === true) {
      await dbQuery(
        'UPDATE admin_notifications SET read_at = NOW() WHERE admin_id = $1 AND read_at IS NULL',
        [admin.id],
      );
    } else if (notificationId) {
      await dbQuery(
        'UPDATE admin_notifications SET read_at = NOW() WHERE id = $1 AND admin_id = $2 AND read_at IS NULL',
        [notificationId, admin.id],
      );
    } else {
      return NextResponse.json({ error: 'Notifikasi yang akan ditandai wajib dipilih.' }, { status: 400 });
    }

    const unread = await dbQuery<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM admin_notifications WHERE admin_id = $1 AND read_at IS NULL',
      [admin.id],
    );
    return NextResponse.json({ unreadCount: Number(unread.rows[0]?.count ?? 0) });
  } catch (error) {
    console.error('Update admin notification error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui notifikasi admin.' }, { status: 500 });
  }
}