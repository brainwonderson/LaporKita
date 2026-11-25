import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/staff-auth';
import { dbQuery } from '@/lib/db';

type StaffNotificationRow = {
  id: string;
  report_id: string | null;
  kind: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export async function GET() {
  try {
    const staff = await getStaffSession();
    if (!staff) return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });

    const [notifications, unread] = await Promise.all([
      dbQuery<StaffNotificationRow>(
        `SELECT id::text, report_id, kind, title, message, created_at, read_at
         FROM staff_notifications
         WHERE staff_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 30`,
        [staff.id],
      ),
      dbQuery<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM staff_notifications WHERE staff_id = $1 AND read_at IS NULL',
        [staff.id],
      ),
    ]);

    return NextResponse.json({
      notifications: notifications.rows.map((notification) => ({
        id: notification.id,
        reportId: notification.report_id,
        kind: notification.kind,
        title: notification.title,
        message: notification.message,
        createdAt: notification.created_at,
        readAt: notification.read_at,
      })),
      unreadCount: Number(unread.rows[0]?.count ?? 0),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get staff notifications error:', error);
    return NextResponse.json({ error: 'Gagal memuat notifikasi petugas.' }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const staff = await getStaffSession();
    if (!staff) return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });

    await dbQuery(
      'UPDATE staff_notifications SET read_at = NOW() WHERE staff_id = $1 AND read_at IS NULL',
      [staff.id],
    );
    return NextResponse.json({ message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (error) {
    console.error('Mark staff notifications read error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status notifikasi.' }, { status: 500 });
  }
}
