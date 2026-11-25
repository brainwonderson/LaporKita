import { NextResponse } from 'next/server';
import { clearResidentSession } from '@/lib/resident-auth';

export async function POST() {
  try {
    await clearResidentSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resident logout error:', error);
    return NextResponse.json({ error: 'Gagal mengakhiri sesi Warga.' }, { status: 500 });
  }
}
