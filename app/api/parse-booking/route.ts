import { NextResponse } from 'next/server';
import { parseBookingRequestWithAI } from '@/lib/openaiParser';

export async function POST(request: Request) {
  try {
    const { input } = await request.json();
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Parse using AI (OpenRouter preferred, OpenAI fallback)
    const result = await parseBookingRequestWithAI(input);

    if (!result || !result.parsed) {
      const errors = result?.errors ?? [{ provider: 'unknown', message: 'No parse result' }];
      return NextResponse.json(
        { error: 'Failed to parse booking request. Ensure API key is set and valid.', errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ parsed: result.parsed, used: 'ai', errors: result.errors });
  } catch (err) {
    console.error('parse-booking API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
