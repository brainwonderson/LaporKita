import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/staff-auth';
import { dbQuery } from '@/lib/db';

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

    const result = await dbQuery<ObstacleRow>(
      `SELECT o.id, o.report_id, o.staff_id, u.name AS staff_name, o.category, o.reason,
              o.photos, o.status, o.resolution_notes, o.resolved_at, o.created_at, o.updated_at
       FROM report_obstacles o
       LEFT JOIN users u ON u.id = o.staff_id
       WHERE o.report_id = $1
       ORDER BY o.created_at DESC`,
      [reportId],
    );

    return NextResponse.json({
      obstacles: result.rows.map((row) => ({
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
        updatedAt: row.updated_at,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Get obstacles error:', error);
    return NextResponse.json({ error: 'Gagal memuat data kendala.' }, { status: 500 });
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
    const category = String(payload?.category ?? '').trim();
    const reason = String(payload?.reason ?? '').trim();
    const photos = Array.isArray(payload?.photos) ? payload.photos : [];

    if (!reportId) {
      return NextResponse.json({ error: 'ID laporan tidak valid.' }, { status: 400 });
    }

    if (category.length < 3 || category.length > 100) {
      return NextResponse.json({ error: 'Pilih atau tentukan kategori kendala yang valid (3-100 karakter).' }, { status: 400 });
    }

    if (reason.length < 10 || reason.length > 1000) {
      return NextResponse.json({ error: 'Alasan dan penjelasan kendala wajib diisi (10 sampai 1.000 karakter).' }, { status: 400 });
    }

    if (photos.length > 3) {
      return NextResponse.json({ error: 'Maksimal lampirkan 3 foto bukti kendala.' }, { status: 400 });
    }

    for (const photo of photos) {
      if (typeof photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(photo) || photo.length > 4_200_000) {
        return NextResponse.json({ error: 'Foto harus berformat JPG, PNG, atau WebP dan berukuran maksimal 3 MB per foto.' }, { status: 400 });
      }
    }

    // Verify report assignment
    const reportCheck = await dbQuery<{ id: string; ticket_number: string }>(
      `SELECT id, ticket_number FROM reports
       WHERE id = $1 AND assigned_staff_id = $2 AND status = 'Diproses'
         AND forwarded_at IS NOT NULL AND agency_response = 'Diterima'
         AND completion_submitted_at IS NULL`,
      [reportId, staff.id],
    );

    if (!reportCheck.rows[0]) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan atau Anda tidak ditugaskan pada laporan ini.' }, { status: 404 });
    }

    const ticketNumber = reportCheck.rows[0].ticket_number;
    const obstacleId = crypto.randomUUID();

    // Insert obstacle and update report work status
    await dbQuery(
      `INSERT INTO report_obstacles (id, report_id, staff_id, category, reason, photos, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Menunggu Solusi')`,
      [obstacleId, reportId, staff.id, category, reason, JSON.stringify(photos)],
    );

    await dbQuery(
      `UPDATE reports
       SET staff_work_status = 'Terkendala', staff_work_updated_at = NOW(), staff_work_updated_by = $2
       WHERE id = $1`,
      [reportId, staff.id],
    );

    // Record into status history
    await dbQuery(
      `INSERT INTO report_status_history (report_id, previous_status, new_status, note)
       VALUES ($1, 'Diproses', 'Diproses', $2)`,
      [reportId, `Petugas melaporkan kendala [${category}]: ${reason}`],
    );

    // Notify admins
    await dbQuery(
      `INSERT INTO admin_notifications (admin_id, report_id, kind, title, message)
       SELECT u.id, $1, 'report_issue', 'Kendala Penanganan Dilaporkan',
              'Petugas ' || $2 || ' melaporkan kendala pada laporan ' || $3 || ': [' || $4 || '] ' || $5
       FROM users u
       WHERE u.role = 'Admin' AND u.is_active = true`,
      [reportId, staff.name, ticketNumber, category, reason],
    );

    return NextResponse.json({
      success: true,
      message: 'Kendala penanganan berhasil dilaporkan kepada instansi.',
      obstacle: {
        id: obstacleId,
        reportId,
        staffId: staff.id,
        staffName: staff.name,
        category,
        reason,
        photos,
        status: 'Menunggu Solusi',
        createdAt: new Date().toISOString(),
      },
      workStatus: 'Terkendala',
    });
  } catch (error) {
    console.error('Submit report obstacle error:', error);
    return NextResponse.json({ error: 'Gagal melaporkan kendala penanganan.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await getStaffSession();
    if (!staff) {
      return NextResponse.json({ error: 'Masuk dengan akun Petugas untuk melanjutkan.' }, { status: 401 });
    }

    const payload = await request.json();
    const reportId = String(payload?.reportId ?? '').trim();
    const obstacleId = String(payload?.obstacleId ?? '').trim();
    const resolutionNotes = String(payload?.resolutionNotes ?? '').trim();

    if (!reportId) {
      return NextResponse.json({ error: 'ID laporan tidak valid.' }, { status: 400 });
    }

    // Verify report assignment
    const reportCheck = await dbQuery<{ id: string; ticket_number: string }>(
      `SELECT id, ticket_number FROM reports
       WHERE id = $1 AND assigned_staff_id = $2 AND status = 'Diproses'`,
      [reportId, staff.id],
    );

    if (!reportCheck.rows[0]) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan atau Anda tidak ditugaskan pada laporan ini.' }, { status: 404 });
    }

    // Update obstacle if obstacleId provided or resolve all pending obstacles for this report
    if (obstacleId) {
      await dbQuery(
        `UPDATE report_obstacles
         SET status = 'Terselesaikan', resolution_notes = $2, resolved_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND report_id = $3 AND staff_id = $4`,
        [obstacleId, resolutionNotes || 'Kendala telah diselesaikan, pekerjaan dilanjutkan.', reportId, staff.id],
      );
    } else {
      await dbQuery(
        `UPDATE report_obstacles
         SET status = 'Terselesaikan', resolution_notes = $2, resolved_at = NOW(), updated_at = NOW()
         WHERE report_id = $1 AND staff_id = $3 AND status = 'Menunggu Solusi'`,
        [reportId, resolutionNotes || 'Kendala telah diselesaikan, pekerjaan dilanjutkan.', staff.id],
      );
    }

    // Update report work status back to Sedang Dikerjakan
    await dbQuery(
      `UPDATE reports
       SET staff_work_status = 'Sedang Dikerjakan', staff_work_updated_at = NOW(), staff_work_updated_by = $2
       WHERE id = $1`,
      [reportId, staff.id],
    );

    // Record into status history
    await dbQuery(
      `INSERT INTO report_status_history (report_id, previous_status, new_status, note)
       VALUES ($1, 'Diproses', 'Diproses', $2)`,
      [reportId, `Kendala penanganan terselesaikan: ${resolutionNotes || 'Pekerjaan dilanjutkan kembali oleh petugas.'}`],
    );

    return NextResponse.json({
      success: true,
      message: 'Kendala ditandai selesai dan penanganan pekerjaan dilanjutkan.',
      workStatus: 'Sedang Dikerjakan',
    });
  } catch (error) {
    console.error('Resolve report obstacle error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status kendala.' }, { status: 500 });
  }
}
