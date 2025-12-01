# Smart Calendar AI - Setup Guide for OpenAI Integration

## 1. Get Your API Key

You need either **Anthropic Claude API** or **OpenAI API**.

### Option A: Anthropic Claude (Recommended for this app)
1. Go to: https://console.anthropic.com/
2. Sign up/login
3. Navigate to **API Keys**
4. Create a new API key
5. Copy it

### Option B: OpenAI GPT
1. Go to: https://platform.openai.com/api-keys
2. Sign up/login
3. Create a new API key
4. Copy it

## 2. Create `.env.local` File

In the project root (same folder as `package.json`), create a file named `.env.local`:

```
ANTHROPIC_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual API key.

⚠️ **Never commit `.env.local` to Git!** It's already in `.gitignore`.

## 3. Install Dependencies

Run:
```bash
npm install
```

This will install the `openai` package and all other dependencies.

## 4. Start the App

```bash
npm run dev
```

Visit http://localhost:3000

## 5. Test It

Now when you submit booking requests, the app will:
1. Try to use Claude AI to parse your request intelligently
2. If that fails, fall back to the regex parser (still works!)

Example requests that now work even better:
- "book a meeting with evan, efrem and nathan for mondays and tuesdays at 9am in december"
- "schedule sync with alice for friday afternoon next month"
- "book team standup with everyone for weekdays early morning december"

## Cost

- **Anthropic Claude**: ~$0.01-0.05 per booking request (pay as you go)
- **OpenAI GPT-3.5**: ~$0.001-0.01 per request

## Troubleshooting

**"ANTHROPIC_API_KEY not set"**
- Make sure `.env.local` file exists in the project root
- Make sure the API key is correct
- Restart `npm run dev`

**API calls failing**
- Check your API key is valid
- Check you have billing set up on your API account
- Check your API rate limits

**Falling back to regex parser**
- This means the AI parser failed, but the app still works!
- Check browser console for error details
- Verify your API key is valid
