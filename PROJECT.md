# WhatsApp Lead Bot — Project Status

**Last updated:** 2026-05-21
**Status:** ✅ Live in Gupshup sandbox, not yet Live for real customers

---

## What this project is

An AI-powered WhatsApp bot for **The German Portal** (Aravind's business helping Indians move to Germany for work). It:

1. Auto-replies to inbound WhatsApp messages
2. Classifies each lead as GREEN / YELLOW / RED / BLUE using Groq AI
3. When a lead hits RED (intent to buy), sends ONE handoff message, pauses the bot, and pings the owner
4. Exposes a dashboard to manage leads, view conversations, and configure brand voice + offers

---

## Where everything lives

| Resource | URL / Location |
|---|---|
| GitHub repo | https://github.com/eruduru/whatsapp-bot |
| Railway project | https://railway.com (under "luminous-emotion") |
| Deployed API | https://whatsapp-bot-production-7365.up.railway.app |
| Postgres | Railway internal (managed automatically) |
| Local code | `C:\Users\Aravind\automations` |
| Dashboard (local) | http://localhost:3000 |
| Gupshup dashboard | https://apps.gupshup.io/whatsapp/dashboard |
| Groq console | https://console.groq.com |

---

## Stack

- **Backend**: Node.js 22 + Express + TypeScript (deployed on Railway)
- **Frontend**: Next.js 16 + Tailwind 4 (runs locally on laptop, points to Railway API)
- **Database**: PostgreSQL via Prisma ORM (Railway managed)
- **AI**: Groq `openai/gpt-oss-120b`, `reasoning_effort: 'low'`
- **WhatsApp**: Gupshup (sandbox right now, will switch to real number on Go Live)
- **Hosting**: Railway (api + Postgres)
- **Auth**: Single-user JWT, bcrypt password hash

---

## Repo structure

```
automations/
├── apps/
│   ├── api/                  # Express backend (deployed to Railway)
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point — boots Express, auto-seeds BotConfig
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts # Imports generated client from ../generated/prisma
│   │   │   │   ├── groq.ts
│   │   │   │   ├── sse.ts    # Server-Sent Events broadcaster
│   │   │   │   └── bootstrap.ts # Ensures default BotConfig exists at startup
│   │   │   ├── middleware/auth.ts
│   │   │   ├── routes/
│   │   │   │   ├── webhook.ts # Gupshup v2 inbound webhook
│   │   │   │   ├── auth.ts
│   │   │   │   ├── leads.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── stream.ts  # SSE endpoint
│   │   │   ├── services/
│   │   │   │   ├── whatsapp.ts # Gupshup send
│   │   │   │   ├── ai.ts       # classify + respond
│   │   │   │   └── pipeline.ts # full inbound pipeline
│   │   │   └── generated/prisma/  # auto-generated Prisma client (gitignored)
│   │   └── tsconfig.json
│   └── web/                  # Next.js dashboard (runs locally)
│       ├── app/
│       │   ├── login/page.tsx
│       │   ├── page.tsx          # Leads list
│       │   ├── leads/[id]/page.tsx
│       │   └── settings/page.tsx
│       ├── components/
│       │   ├── StageChip.tsx
│       │   └── SseListener.tsx
│       └── lib/{utils.ts,types.ts}
├── packages/shared/          # Shared TS types
├── prisma/
│   ├── schema.prisma         # generator outputs to apps/api/src/generated/prisma
│   ├── seed.ts               # legacy — superseded by bootstrap.ts
│   └── migrations/
├── scripts/
│   ├── hash-password.ts      # generate bcrypt hash for dashboard login
│   └── test-classifier.ts    # run 5 sample classifications
├── .env                      # local secrets — gitignored
├── .env.example
├── .nvmrc                    # Node 22
├── package.json              # workspace root
└── PROJECT.md                # this file
```

---

## Credentials reference

All secrets live in `.env` (gitignored) for local + Railway env vars for prod. Current values:

| Key | Value (or where to find it) |
|---|---|
| `GROQ_API_KEY` | In `.env` and on Railway. From console.groq.com |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `GUPSHUP_API_KEY` | In `.env` and on Railway. From Gupshup app settings |
| `GUPSHUP_APP_NAME` | `germanportalbot` |
| `GUPSHUP_SOURCE_NUMBER` | `917834811114` (sandbox — change after Go Live) |
| `DATABASE_URL` | Local: `postgresql://postgres:postgres@127.0.0.1:5432/whatsapp_lead_bot`. Railway: `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Anything random. Currently `tgp_dev_jwt_secret_change_me_b59f3e2c` — **rotate before going live** |
| `DASHBOARD_USER_EMAIL` | `admin@example.com` |
| `DASHBOARD_USER_PASSWORD_HASH` | bcrypt of `admin123` — **change before going live** |
| `DASHBOARD_URL` | `https://whatsapp-bot-production-7365.up.railway.app` (used in hot-lead pings) |

---

## What's done

### Phase 1 — Scaffolding ✅
- pnpm monorepo (workspace packages: api, web, shared)
- Prisma schema with Lead, Message, BotConfig, AiLog models
- TypeScript strict mode
- Local PostgreSQL 17 (installed via winget, runs as user process)

### Phase 2 — Backend ✅
- Express API with: webhook, auth (JWT + bcrypt), leads CRUD, config CRUD, SSE stream
- Gupshup v2 webhook parsing (was originally Meta, switched mid-build)
- Gupshup send via REST API
- Groq classifier + responder (both `reasoning_effort: 'low'`)
- Full pipeline: classify → handle BLUE / handle RED transition (handoff + pause + owner ping) / normal reply
- All AI calls logged to `AiLog` table
- 24h window check before any auto-reply

### Phase 3 — Dashboard ✅
- Login page (JWT auth)
- Leads list with stage filter chips, search, pagination, live SSE updates
- Lead detail with WhatsApp-style thread, bot/owner bubble differentiation, bot toggle, stage override, notes, manual reply
- Settings page with editable brand voice, offers (add/remove), instructions, handoff message, owner phone
- Dark mode theme with The German Portal palette (#0a0f1f, #c9a961, #dc2626)

### Phase 4 — Deploy ✅
- Code pushed to GitHub (`eruduru/whatsapp-bot`)
- Railway project created with api service + Postgres
- Build/start chain works: install → prisma generate → tsc → copy generated to dist → migrate → start
- API live and verified responding at `/health`
- Auto-bootstrap creates default BotConfig on first run

### Phase 5 — Wiring ✅
- Gupshup webhook configured pointing at Railway URL with Gupshup v2 format
- End-to-end tested: WhatsApp message → Gupshup → Railway API → Groq AI → reply back to phone
- First successful test was GREEN flow: "Hi" → "Hello! 👋 How can I assist you with your German career plans today?"

---

## Known gotchas / decisions made

1. **Prisma client output is custom**: `apps/api/src/generated/prisma/`. This is because pnpm workspaces don't reliably regenerate `@prisma/client` across packages. Importing from `'@prisma/client'` will NOT work in this codebase — use the relative path `'../generated/prisma/index.js'`.

2. **Generated client must be copied to dist**: The api build script does this:
   ```
   tsc && node -e "require('fs').cpSync('src/generated','dist/generated',{recursive:true})"
   ```
   If you change the build process, make sure this copy step survives.

3. **Node version pinned to 22.x**: Node 24 has a corepack ESM bug. Don't bump.

4. **Seed runs at API startup, not as a pnpm script**: Originally `pnpm db:seed` ran `node --import tsx/esm prisma/seed.ts`, but tsx + Node 22 crashed with `ERR_REQUIRE_CYCLE_MODULE`. Solution: `apps/api/src/lib/bootstrap.ts` creates default BotConfig if missing, called from `index.ts` at startup.

5. **Express types**: Routes use `IRouter` annotation to dodge a pnpm `TS2742` portability error. Don't remove the type annotations.

6. **SSE auth via query param**: `EventSource` can't set headers, so `/stream` accepts the JWT via `?token=...`. Other endpoints use the `Authorization: Bearer` header.

7. **Railway uses Railpack (not Nixpacks)**: Don't add a `nixpacks.toml` — it'll be ignored. Build config lives in `package.json` scripts.

8. **Dashboard is local-only**: `apps/web` is NOT deployed. It runs on the laptop with `pnpm dev:web` and points to the Railway API. Deploying it would be a second Railway service (not done — costs extra, not necessary for v1).

---

## How to resume work in a new session

### Start the dashboard
```powershell
cd C:\Users\Aravind\automations
pnpm dev:web
# Open http://localhost:3000, log in: admin@example.com / admin123
```

### Start the local API (only if you want to test changes before pushing)
```powershell
cd C:\Users\Aravind\automations\apps\api
node node_modules\tsx\dist\cli.mjs src/index.ts
```
(Make sure local Postgres is running. The Railway API runs independently 24/7.)

### Make code changes
```powershell
# Edit files in apps/api/src or apps/web/app/etc.
git add -A
git commit -m "..."
git push
# Railway auto-deploys within ~30s
```

### Watch Railway deploys
https://railway.com → luminous-emotion → whatsapp-bot service → Deployments tab

### Trigger a manual redeploy
On Railway → whatsapp-bot service → click ⋮ on latest deployment → Redeploy

### Check Postgres directly (local)
```powershell
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -U postgres -d whatsapp_lead_bot
```

---

## What's NOT done — to-do list

### 🔴 Before going live with real customers

1. **Test the full GREEN → YELLOW → RED flow** — only GREEN has been tested. Need to confirm:
   - YELLOW: bot answers pricing/eligibility questions accurately
   - RED: bot sends handoff message, pauses, AND owner gets the 🔥 hot-lead ping on +49 17641239849

2. **Test BLUE** — send "not interested" and confirm bot stops replying. Critical to not annoy uninterested leads (Meta flag risk).

3. **Customize brand voice + offers in the Settings page**
   - Currently uses my placeholder defaults
   - Add real offers (with real prices, real links) — the bot will ONLY mention what's in the offers list
   - Write Instructions tailored to The German Portal (e.g. "Use Manglish for Kerala leads", "Always emphasize current promotion")

4. **Change dashboard password from `admin123`**
   ```powershell
   cd C:\Users\Aravind\automations\apps\api
   node -e "require('./node_modules/bcryptjs').hash('YOUR_NEW_PASSWORD', 12).then(h => console.log(h))"
   ```
   Copy the hash → update `DASHBOARD_USER_PASSWORD_HASH` on Railway → click Apply

5. **Rotate JWT_SECRET** — currently `tgp_dev_jwt_secret_change_me_b59f3e2c`. Replace with a 32+ char random string on Railway.

6. **Go Live with a real WhatsApp number** through Gupshup
   - Click "Begin Go Live" in Gupshup dashboard
   - Requires: Facebook Business Manager, phone number, display name
   - Meta approval takes ~1-5 days
   - Once approved, update `GUPSHUP_SOURCE_NUMBER` env var on Railway

### 🟡 Nice to have (not blocking)

7. **Deploy dashboard to Railway** — currently local-only. Would add ~$5/month. Useful if Aravind wants to manage leads from his phone or other devices.

8. **Handle non-text messages** — webhook currently ignores images/voice/stickers. If leads send their passport scan, the bot stays silent. Need to either reply asking for text, or send to OCR.

9. **More AI tuning** — test 10-20 real-style conversations and adjust brand voice / instructions based on what feels off.

10. **Re-engagement flow for BLUE leads** — currently no auto-reply. Could add owner-triggered re-engagement template messages (24h window allowing).

11. **Analytics page** — show conversion rate, average time-to-RED, classifier accuracy. Just an extra page on the dashboard. Data is already logged.

12. **CI/CD checks** — Railway deploys on every push to main. No tests, no PR review. Fine for v1 but should add lint + typecheck on push at some point.

---

## Quick architecture diagram

```
Customer's WhatsApp
       ↓ (1) sends message
Gupshup (BSP — sandbox: +91 78348 11114)
       ↓ (2) POST webhook
Railway API (whatsapp-bot-production-7365.up.railway.app/webhook/whatsapp)
       ↓ (3) classify + respond
   Groq API ←─────────────────────┐
       ↓ (4) save state            │
   Railway Postgres                │
       ↓ (5) send reply            │
Gupshup API ←───────────────────────
       ↓ (6) deliver
Customer's WhatsApp

Meanwhile:
Owner's laptop → http://localhost:3000 → HTTPS calls → Railway API → live updates via SSE
```

---

## If anything breaks

1. **Bot stops replying** → check Railway Deployments tab for crashes. View Deploy Logs.
2. **Dashboard can't connect** → check `apps/web/.env.local` points to right Railway URL.
3. **Login fails** → verify `DASHBOARD_USER_EMAIL` + `DASHBOARD_USER_PASSWORD_HASH` env vars on Railway match.
4. **Webhook 401s** → Gupshup signature/auth mismatch. Currently we don't verify HMAC for Gupshup; was relevant only for the deprecated Meta path.
5. **Database connection fails** → Postgres on Railway may have restarted. Check Railway Postgres service status.

---

*Built with Claude Code over one afternoon (~5 hours), 2026-05-21.*
