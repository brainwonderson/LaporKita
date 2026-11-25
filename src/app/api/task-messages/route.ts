import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAgencySession } from '@/lib/agency-auth';
import { dbQuery } from '@/lib/db';
import { getStaffSession } from '@/lib/staff-auth';

type TaskMessageRow = {
  id: string;
  report_id: string;
  author_id: string | null;
  author_name: string;
  author_role: 'Petugas' | 'Admin Instansi';
  message: string;
  created_at: string;
};

type Participant =
  | { id: string; name: string; role: 'Petugas' }
  | { id: string; name: string; role: 'Admin Instansi'; agencyName: string };

async function getParticipant(): Promise<Participant | null> {
  const staff = await getStaffSession();
  if (staff) return { ...staff, role: 'Petugas' };

  const agencyAdmin = await getAgencySession();
  if (agencyAdmin) return { ...agencyAdmin, role: 'Admin Instansi', agencyName: agencyAdmin.agency_name };
  return null;
}

async function canAccessTask(reportId: string, participant: Participant) {
  const result = participant.role === 'Petugas'
    ? await dbQuery<{ id: string }>(
        `SELECT id FROM reports
         WHERE id = $1 AND assigned_staff_id = $2
           AND status IN ('Diproses', 'Selesai')
           AND forwarded_at IS NOT NULL AND agency_response = 'Diterima'`,
        [reportId, participant.id],
      )
    : await dbQuery<{ id: string }>(
        `SELECT id FROM reports
         WHERE id = $1 AND assigned_agency = $2 AND assigned_staff_id IS NOT NULL
           AND status IN ('Diproses', 'Selesai')
           AND forwarded_at IS NOT NULL AND agency_response = 'Diterima'`,
        [reportId, participant.agencyName],
      );

  return result.rows.length > 0;
}

function serializeMessage(row: TaskMessageRow) {
  return {
    id: row.id,
    reportId: row.report_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  try {
    const participant = await getParticipant();
    if (!participant) {
      return NextResponse.json({ error: 'Masuk dengan akun Petugas atau Admin Instansi untuk melanjutkan.' }, { status: 401 });
    }

    const reportId = new URL(request.url).searchParams.get('reportId')?.trim();
    if (!reportId) {
      return NextResponse.json({ error: 'ID tugas tidak disertakan.' }, { status: 400 });
    }
    if (!await canAccessTask(reportId, participant)) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan atau Anda tidak memiliki akses.' }, { status: 404 });
    }

    const result = await dbQuery<TaskMessageRow>(
      `SELECT id, report_id, author_id, author_name, author_role, message, created_at
       FROM report_task_messages
       WHERE report_id = $1
       ORDER BY created_at ASC, id ASC`,
      [reportId],
    );
    return NextResponse.json(
      { messages: result.rows.map(serializeMessage) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Get task messages error:', error);
    return NextResponse.json({ error: 'Gagal memuat percakapan tugas.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const participant = await getParticipant();
    if (!participant) {
      return NextResponse.json({ error: 'Masuk dengan akun Petugas atau Admin Instansi untuk melanjutkan.' }, { status: 401 });
    }

    let payload: { reportId?: unknown; message?: unknown };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Format pesan tidak valid.' }, { status: 400 });
    }
    const reportId = String(payload.reportId ?? '').trim();
    const message = String(payload.message ?? '').trim();
    if (!reportId) {
      return NextResponse.json({ error: 'ID tugas tidak valid.' }, { status: 400 });
    }
    if (message.length < 1 || message.length > 2000) {
      return NextResponse.json({ error: 'Pesan wajib diisi dan maksimal 2.000 karakter.' }, { status: 400 });
    }
    const taskAccessCondition = participant.role === 'Petugas'
      ? 'r.assigned_staff_id = $7'
      : 'r.assigned_agency = $7 AND r.assigned_staff_id IS NOT NULL';
    const inserted = await dbQuery<TaskMessageRow>(
      `WITH inserted AS (
         INSERT INTO report_task_messages
           (id, report_id, author_id, author_name, author_role, message)
         SELECT $1, r.id, $3, $4, $5, $6
         FROM reports r
         WHERE r.id = $2 AND r.status IN ('Diproses', 'Selesai')
           AND r.forwarded_at IS NOT NULL AND r.agency_response = 'Diterima'
           AND ${taskAccessCondition}
         RETURNING id, report_id, author_id, author_name, author_role, message, created_at
       ), notification AS (
         INSERT INTO staff_notifications (staff_id, report_id, kind, title, message)
         SELECT r.assigned_staff_id, r.id, 'task_message', 'Pesan baru dari Admin Instansi',
                'Admin Instansi mengirim pesan terkait tugas ' || r.ticket_number || '.'
         FROM reports r
         JOIN inserted ON inserted.report_id = r.id
         WHERE $5 = 'Admin Instansi' AND r.assigned_staff_id IS NOT NULL
         RETURNING id
       )
       SELECT inserted.id, inserted.report_id, inserted.author_id, inserted.author_name,
              inserted.author_role, inserted.message, inserted.created_at
       FROM inserted
       CROSS JOIN (SELECT COUNT(*) FROM notification) AS notification_count`,
      [
        randomUUID(),
        reportId,
        participant.id,
        participant.name,
        participant.role,
        message,
        participant.role === 'Petugas' ? participant.id : participant.agencyName,
      ],
    );
    if (!inserted.rows[0]) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan atau Anda tidak memiliki akses.' }, { status: 404 });
    }

    return NextResponse.json({ message: serializeMessage(inserted.rows[0]) }, { status: 201 });
  } catch (error) {
    console.error('Create task message error:', error);
    return NextResponse.json({ error: 'Gagal mengirim pesan tugas.' }, { status: 500 });
  }
}
