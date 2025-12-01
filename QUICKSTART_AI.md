# Smart Calendar AI with OpenAI Integration - Quick Start

Your app now has **real AI-powered booking parsing** using Claude AI!

## What Changed

✅ Added `lib/openaiParser.ts` - Uses Claude AI to parse natural language  
✅ Updated `app/page.tsx` - Calls AI parser first, falls back to regex  
✅ Updated `components/NaturalLanguageInput.tsx` - Shows loading state  
✅ Added `package.json` - Includes `openai` package  

## Setup (5 minutes)

### 1. Get Anthropic Claude API Key

Go to: https://console.anthropic.com/

- Sign up (free tier available)
- Navigate to **API Keys**
- Create new API key
- Copy it

### 2. Create `.env.local` File

In your project root (same folder as `package.json`), create `.env.local`:

```
ANTHROPIC_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual key.

### 3. Dependencies Already Installed ✅

Run:
```bash
npm run dev
```

The server should already be running at **http://localhost:3000**

## How It Works Now

When you submit a booking request:

1. **Claude AI parses** your natural language → extracts names, days, times, month
2. **Fallback to regex** if AI fails (still works!)
3. **Creates bookings** for all matched dates
4. **Shows results** in calendar

## Example Requests That Now Work

```
"book a meeting with evan, efrem and nathan for mondays and tuesdays at 9am in december"

"schedule sync with alice and bob for friday afternoon next week"

"team standup with everyone for weekdays 9am-9:30am"

"book workshop with john, jane for christmas week at 2pm"
```

Much more flexible than the old regex parser!

## Troubleshooting

**"ANTHROPIC_API_KEY not set"**
- Create `.env.local` in project root
- Add your API key
- Restart `npm run dev`

**Fallback to regex parser**
- App still works! Just uses old regex parser
- Check browser console for error
- Verify API key is valid

**npm install failed**
- Run: `npm cache clean --force && npm install`

## Cost

- **Claude AI**: Free tier available, then ~$0.01-0.05 per request
- **Very affordable** for booking requests

## Files Changed

- `lib/openaiParser.ts` - NEW (AI parsing)
- `app/page.tsx` - UPDATED (call AI parser)
- `components/NaturalLanguageInput.tsx` - UPDATED (loading state)
- `package.json` - UPDATED (added openai)
- `.env.example` - NEW (template)
- `OPENAI_SETUP.md` - NEW (detailed setup)

## Next Steps

1. Create `.env.local` with your API key
2. Visit http://localhost:3000
3. Try a natural language booking!
4. Watch the AI parse it intelligently

That's it! You now have a **true Smart Calendar AI**! 🤖📅
