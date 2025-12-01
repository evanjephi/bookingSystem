// lib/openaiParser.ts
import { ParsedBookingRequest } from '@/types';
import { OpenAI } from 'openai';
import { OpenRouter } from '@openrouter/sdk';

/**
 * Uses OpenAI GPT to intelligently parse natural language booking requests
 * Much smarter than regex - handles complex sentences, typos, variations
 */
export async function parseBookingRequestWithAI(
  input: string
): Promise<{ parsed: ParsedBookingRequest | null; errors: Array<{ provider: string; message: string }> }> {
  try {
    // Support either OPENAI_API_KEY (for OpenAI) or ANTHROPIC_API_KEY (if user set Anthropic key)
    // Support OpenRouter first, then OpenAI. (Anthropic not implemented here.)
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let responseText = '';
    const errors: Array<{ provider: string; message: string }> = [];

    if (openRouterKey) {
        console.info('OpenRouter parser: using API key from OPENROUTER_API_KEY');
        // Use OpenRouter SDK
        const openRouter = new OpenRouter({
          apiKey: openRouterKey,
        });

        const systemPrompt = `You are a calendar booking AI assistant. Parse natural language booking requests and extract structured data.

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "attendees": ["name1", "name2"],
  "daysOfWeek": ["monday", "wednesday"],
  "day": 25,
  "startTime": "09:00",
  "endTime": "10:00",
  "month": 12,
  "year": 2025,
  "title": "meeting name"
}

Rules:
- attendees: array of lowercase names mentioned with "with"
- daysOfWeek: array of lowercase day names (monday-sunday) - use when day name is mentioned
- day: specific day of month (1-31) - use when a specific date is mentioned like "November 25th" or "the 25th"
- startTime/endTime: 24-hour HH:MM format
- month: 1-12 (if not specified, use current month)
- year: 4-digit (if not specified, use current year)
- title: the meeting type/name (default: "Team Meeting")

Examples:
- "November 25th" → { "day": 25, "month": 11 }
- "the 15th of December" → { "day": 15, "month": 12 }
- "Monday" → { "daysOfWeek": ["monday"] } (no day field)`;

        const userMessage = `Parse this booking request: "${input}"`;

        try {
          const completion = await openRouter.chat.send({
            model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            stream: false,
          });

          // Extract text content from the response (can be a string or array of content items)
          const content = completion.choices?.[0]?.message?.content;
          if (typeof content === 'string') {
            responseText = content;
          } else if (Array.isArray(content) && content.length > 0) {
            // If it's an array of content items, find the text one
            const textItem = content.find((item: any) => item.type === 'text' || typeof item === 'string') as any;
            responseText = typeof textItem === 'string' ? textItem : textItem?.text ?? '';
          }
        } catch (err) {
          console.error('OpenRouter request failed:', err);
          // Capture the error message for diagnostics (avoid leaking sensitive data)
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ provider: 'openrouter', message: msg });
        }

    }

    // If OpenRouter did not produce a usable response, and OpenAI key is present, fall back to OpenAI
    if (!responseText && openaiKey) {
      const apiKey = openaiKey;
      console.info('Falling back to OpenAI parser: using API key from OPENAI_API_KEY');
      const client = new OpenAI({ apiKey });

      const systemPrompt = `You are a calendar booking AI assistant. Parse natural language booking requests and extract structured data.

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "attendees": ["name1", "name2"],
  "daysOfWeek": ["monday", "wednesday"],
  "day": 25,
  "startTime": "09:00",
  "endTime": "10:00",
  "month": 12,
  "year": 2025,
  "title": "meeting name"
}

Rules:
- attendees: array of lowercase names mentioned with "with"
- daysOfWeek: array of lowercase day names (monday-sunday) - use when day name is mentioned
- day: specific day of month (1-31) - use when a specific date is mentioned like "November 25th" or "the 25th"
- startTime/endTime: 24-hour HH:MM format
- month: 1-12 (if not specified, use current month)
- year: 4-digit (if not specified, use current year)
- title: the meeting type/name (default: "Team Meeting")

Examples:
- "November 25th" → { "day": 25, "month": 11 }
- "the 15th of December" → { "day": 15, "month": 12 }
- "Monday" → { "daysOfWeek": ["monday"] } (no day field)`;

      const userMessage = `Parse this booking request: "${input}"`;

      try {
        const completion = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          max_tokens: 500,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        });

        responseText = completion.choices?.[0]?.message?.content ?? '';
      } catch (err) {
        console.error('OpenAI request failed:', err);
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ provider: 'openai', message: msg });
      }
    } else if (!responseText) {
      console.error('No supported API returned a response. Set OPENROUTER_API_KEY or OPENAI_API_KEY.');
      errors.push({ provider: 'none', message: 'No provider returned a response' });
      return { parsed: null, errors };
    }

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      errors.push({ provider: 'model', message: 'No JSON found in model response' });
      return { parsed: null, errors };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedBookingRequest;
    return { parsed, errors };
  } catch (error) {
    console.error('OpenAI parsing error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { parsed: null, errors: [{ provider: 'exception', message: msg }] };
  }
}
