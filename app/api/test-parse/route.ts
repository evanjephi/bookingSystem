import { NextResponse } from 'next/server';
import { parseBookingRequestWithAI } from '@/lib/openaiParser';

export async function GET() {
  const sample = 'book a meeting with evan and efrem for mondays at 9am in december';
  try {
    const parsed = await parseBookingRequestWithAI(sample);
    return NextResponse.json({ success: true, parsed });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
