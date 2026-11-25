import { NextResponse } from 'next/server';
import { clearStaffSession } from '@/lib/staff-auth';

export async function POST() {
  try {
    await clearStaffSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff logout error:', error);
    return NextResponse.json({ error: 'Gagal mengakhiri sesi Petugas.' }, { status: 500 });
  }
}