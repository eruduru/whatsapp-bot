# WhatsApp Lead Bot — The German Portal

Auto-replies to WhatsApp leads, classifies them GREEN/YELLOW/RED/BLUE, hands off hot leads with a single message, and pauses the bot so you can take over.

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Run migrations and seed
pnpm db:migrate
pnpm db:seed

# 4. Generate a password hash for your dashboard login
pnpm tsx scripts/hash-password.ts
# Copy the output hash into .env as DASHBOARD_USER_PASSWORD_HASH

# 5. Start dev servers
pnpm dev:api   # API on http://localhost:3001
pnpm dev:web   # Dashboard on http://localhost:3000
```

## Registering the WhatsApp webhook with Meta

1. Go to [Meta for Developers](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks) → your app → WhatsApp → Configuration.
2. Set webhook URL to `https://your-domain.com/webhook/whatsapp`.
3. Set verify token to the value of `WHATSAPP_VERIFY_TOKEN` in your `.env`.
4. Subscribe to the `messages` field.

## Getting a Groq API key

Sign up at [https://console.groq.com](https://console.groq.com) and create an API key. Set it as `GROQ_API_KEY`.

## Adding an owner login

```bash
pnpm tsx scripts/hash-password.ts
```

Copy the output into `.env`:
```
DASHBOARD_USER_EMAIL=you@example.com
DASHBOARD_USER_PASSWORD_HASH=<paste hash here>
```

## Railway deploy

1. Push this repo to GitHub.
2. On Railway: New Project → Deploy from GitHub → select this repo.
3. Add a PostgreSQL add-on (Railway Postgres).
4. Copy the `DATABASE_URL` from the Postgres add-on into your service env vars.
5. Set all other env vars from `.env.example`.
6. Railway will auto-detect `pnpm` and run `pnpm build`.
7. Update `DASHBOARD_URL` to your deployed frontend URL.
8. Point your Meta webhook at the deployed API URL.

## Testing the classifier

```bash
pnpm tsx scripts/test-classifier.ts
```

Runs 5 hand-crafted conversations and prints the stage + reason for each.

## Notes

### `reasoning_effort`
Currently set to `"low"` for sub-second latency. Bumping to `"medium"` or `"high"` improves classification quality on edge cases but adds 2–5s per message — not recommended for v1.

### Swapping models via `GROQ_MODEL`
- `openai/gpt-oss-120b` (default) — best quality
- `llama-3.3-70b-versatile` — cheaper, slightly less capable
- `openai/gpt-oss-20b` — fastest, lightest

### 24-hour window
Meta only allows free-form text messages within 24 hours of the last inbound message. The bot checks this before sending. If the window has passed, the auto-reply is skipped and a warning appears in the dashboard.
