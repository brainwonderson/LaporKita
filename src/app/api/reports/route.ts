import { NextResponse } from 'next/server';
import { dbQuery, ensureDatabaseSchema } from '@/lib/db';

type ReportRow = {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  agency: string;
  location: string;
  coordinates: object;
  date: string;
  status: string;
  urgency: string;
  description: string;
  images: object;
  reporter_name: string | null;
  reporter_id: string | null;
  is_anonymous: boolean;
  likes: number;
  created_at: string;
};

export async function GET() {
  try {
    await ensureDatabaseSchema();

    const rows = await dbQuery<ReportRow>(`SELECT * FROM reports ORDER BY created_at DESC`);
    const reportList = rows.rows as ReportRow[];

    const reports = reportList.map((report: ReportRow) => ({
      id: report.id,
      ticketNumber: report.ticket_number,
      title: report.title,
      category: report.category,
      agency: report.agency,
      location: report.location,
      coordinates: report.coordinates as {
        lat: number;
        lng: number;
        accuracy?: number;
        displayAddress?: string;
      },
      date: report.date,
      status: report.status as 'Menunggu' | 'Diproses' | 'Selesai' | 'Ditolak',
      urgency: report.urgency as 'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat',
      description: report.description,
      images: Array.isArray(report.images) ? report.images as string[] : [],
      reporterName: report.reporter_name ?? undefined,
      reporterId: report.reporter_id ?? undefined,
      isAnonymous: report.is_anonymous,
      likes: Number(report.likes ?? 0),
    }));

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = payload ?? {};

    if (!data.title || !data.category || !data.agency || !data.location || !data.description) {
      return NextResponse.json({ error: 'Data laporan tidak lengkap.' }, { status: 400 });
    }

    await ensureDatabaseSchema();

    const categoryName = String(data.category).trim();
    const categoryResult = await dbQuery<{ name: string; default_agency: string }>(
      `SELECT c.name, c.default_agency
       FROM report_categories c
       JOIN report_agencies a ON a.name = c.default_agency AND a.is_active = true
       WHERE c.name = $1 AND c.is_active = true`,
      [categoryName],
    );
    const activeCategory = categoryResult.rows[0];
    if (!activeCategory) {
      return NextResponse.json({ error: 'Kategori tidak tersedia. Pilih kategori aktif yang tersedia.' }, { status: 400 });
    }
    const requestedAgency = String(data.agency).trim();
    const agencyResult = await dbQuery<{ name: string }>(
      'SELECT name FROM report_agencies WHERE name = $1 AND is_active = true',
      [requestedAgency],
    );
    const activeAgency = agencyResult.rows[0];
    if (!activeAgency) {
      return NextResponse.json({ error: 'Instansi tidak tersedia. Pilih instansi aktif yang tersedia.' }, { status: 400 });
    }

    const reportId = crypto.randomUUID();
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dateString = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    const randomTicketSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `LPK-${today.getFullYear()}-${randomTicketSuffix}`;

    const coordinates = data.coordinates || {
      lat: -6.402484,
      lng: 106.828241,
      accuracy: 10,
      displayAddress: data.location,
    };

    const images = Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : ['https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80'];

    const report = await dbQuery<ReportRow>(
      `INSERT INTO reports (
        id, ticket_number, title, category, agency, location, coordinates, date, status, urgency, description, images, reporter_name, is_anonymous, likes, reporter_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        reportId,
        ticketNumber,
        data.title,
        activeCategory.name,
        activeAgency.name,
        data.location,
        JSON.stringify(coordinates),
        dateString,
        'Menunggu',
        data.urgency,
        data.description,
        JSON.stringify(images),
        data.isAnonymous ? 'Warga Anonim' : (data.reporterName ?? 'Warga Peduli'),
        Boolean(data.isAnonymous),
        1,
        data.reporterId || null,
      ],
    );

    const created = report.rows[0] as ReportRow;

    return NextResponse.json({
      report: {
        id: created.id,
        ticketNumber: created.ticket_number,
        title: created.title,
        category: created.category,
        agency: created.agency,
        location: created.location,
        coordinates: created.coordinates as {
          lat: number;
          lng: number;
          accuracy?: number;
          displayAddress?: string;
        },
        date: created.date,
        status: created.status as 'Menunggu' | 'Diproses' | 'Selesai' | 'Ditolak',
        urgency: created.urgency as 'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat',
        description: created.description,
        images: Array.isArray(created.images) ? created.images as string[] : [],
        reporterName: created.reporter_name ?? undefined,
        reporterId: created.reporter_id ?? undefined,
        isAnonymous: created.is_anonymous,
        likes: Number(created.likes ?? 0),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan laporan ke PostgreSQL.' },
      { status: 500 },
    );
  }
}
