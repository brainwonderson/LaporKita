import { NextResponse } from 'next/server';
import { clearAgencySession } from '@/lib/agency-auth';

export async function POST() {
  try {
    await clearAgencySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agency admin logout error:', error);
    return NextResponse.json({ error: 'Gagal mengakhiri sesi Admin Instansi.' }, { status: 500 });
  }
}
