# WhatsApp Lead Bot — Project Status

**Last updated:** 2026-05-22
**Status:** ✅ Live on Meta WhatsApp Cloud API direct (test mode). End-to-end working. Not yet on real customer-facing number.

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
| Meta for Developers | https://developers.facebook.com → app: `tgp-bot` |
| Meta Business Manager | https://business.facebook.com → portfolio: `Tgp` |
| Groq console | https://console.groq.com |

> **Heads up:** the Meta developer account is a *secondary* Facebook account created to bypass a developer-platform restriction on the primary account. Don't lose access to it. Long-term, business verification (when ready to go live with a real number) may need the real Business Manager linked to this app.

---

## Stack

- **Backend**: Node.js 22 + Express + TypeScript (deployed on Railway)
- **Frontend**: Next.js 16 + Tailwind 4 (runs locally on laptop, points to Railway API)
- **Database**: PostgreSQL via Prisma ORM (Railway managed)
- **AI**: Groq `openai/gpt-oss-120b`, `reasoning_effort: 'low'`
- **WhatsApp**: Meta WhatsApp Business Cloud API **direct** (no BSP). Currently in test mode with a Meta-provided test sender number; will be a real number after business verification + display name approval.
- **Hosting**: Railway (api + Postgres)
- **Auth**: Single-user JWT, bcrypt password hash

---

## Repo structure

```
automations/
├── apps/
│   ├── api/                  # Express backend (deployed to Railway)
│   │   ├── src/
│   │   │   ├── index.ts      # Boots Express, raw-body capture for HMAC, auto-seeds BotConfig
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts # Imports generated client from ../generated/prisma
│   │   │   │   ├── groq.ts
│   │   │   │   ├── sse.ts    # Server-Sent Events broadcaster
│   │   │   │   └── bootstrap.ts # Ensures default BotConfig exists at startup
│   │   │   ├── middleware/auth.ts
│   │   │   ├── routes/
│   │   │   │   ├── webhook.ts # Meta Cloud API webhook (GET verify + POST inbound + HMAC)
│   │   │   │   ├── auth.ts
│   │   │   │   ├── leads.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── stream.ts  # SSE endpoint
│   │   │   ├── services/
│   │   │   │   ├── whatsapp.ts # Meta Graph API send (v21.0)
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
├── PROJECT.md                # this file (long-term reference)
└── HANDOVER.md               # session-to-session notes
```

---

## Credentials reference

All secrets live in `.env` (gitignored) for local + Railway env vars for prod.

| Key | Value (or where to find it) |
|---|---|
| `GROQ_API_KEY` | In `.env` and on Railway. From console.groq.com |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `WHATSAPP_PHONE_NUMBER_ID` | `1170849442771686` (test sender, +1 555 642 6683). Get from Meta → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | **Temporary 24h token** — regenerate from Meta API Setup → "Generate access token". Will switch to a System User permanent token before launch. |
| `WHATSAPP_APP_SECRET` | `71fa3474b30bc6f468f0ae7cedddeaec` — from Meta → App settings → Basic |
| `WHATSAPP_VERIFY_TOKEN` | `tgpbot` — chosen by us, also pasted into Meta → WhatsApp → Configuration → Webhook |
| `WHATSAPP_GRAPH_VERSION` | `v21.0` (optional, defaults to this) |
| `DATABASE_URL` | Local: `postgresql://postgres:postgres@127.0.0.1:5432/whatsapp_lead_bot`. Railway: `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `tgp_dev_jwt_secret_change_me_b59f3e2c` — **rotate before going live** |
| `DASHBOARD_USER_EMAIL` | `admin@example.com` |
| `DASHBOARD_USER_PASSWORD_HASH` | bcrypt of `admin123` — **change before going live** |
| `DASHBOARD_URL` | `https://whatsapp-bot-production-7365.up.railway.app` (used in hot-lead pings) |

> Old Gupshup vars (`GUPSHUP_API_KEY`, `GUPSHUP_APP_NAME`, `GUPSHUP_SOURCE_NUMBER`) may still be on Railway. They are no longer referenced by code — safe to delete, but harmless to leave.

---

## What's done

### Phase 1 — Scaffolding ✅
- pnpm monorepo (workspace packages: api, web, shared)
- Prisma schema with Lead, Message, BotConfig, AiLog models
- TypeScript strict mode
- Local PostgreSQL 17

### Phase 2 — Backend ✅
- Express API with: webhook, auth (JWT + bcrypt), leads CRUD, config CRUD, SSE stream
- Originally Meta → switched to Gupshup mid-build → **switched back to Meta Cloud API direct on 2026-05-22**
- Webhook: handles Meta's `GET` verification challenge + `POST` inbound (entry → changes → value → messages)
- Send: `POST graph.facebook.com/v21.0/{phone_number_id}/messages` with Bearer token
- HMAC SHA-256 signature verification against `X-Hub-Signature-256` header using App Secret
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
- Build/start chain: install → prisma generate → tsc → copy generated to dist → migrate → start
- API live and verified at `/health`
- Auto-bootstrap creates default BotConfig on first run

### Phase 5 — Wiring ✅
- Meta `tgp-bot` app created on alt Facebook account
- WhatsApp product added; test sender + test recipient configured
- Webhook URL set to `/webhook/whatsapp` with verify token `tgpbot`
- Subscribed to `messages` field
- End-to-end tested **2026-05-22**: WhatsApp from test phone → Meta → Railway API → Groq AI → reply back ✅

---

## Known gotchas / decisions made

1. **Meta access token is currently TEMPORARY (24h).** When the bot stops replying with `Authentication Error code 190`, regenerate from Meta → WhatsApp → API Setup → "Generate access token", paste into Railway as `WHATSAPP_ACCESS_TOKEN`, redeploy. This is fine for testing; for launch we need a permanent System User token (see TODO list).

2. **Webhook needs the raw request body** for HMAC verification. `index.ts` configures `express.json({ verify: (req,_,buf) => { req.rawBody = buf } })`. Don't replace with a plain `express.json()` — signature checks will fail.

3. **Prisma client output is custom**: `apps/api/src/generated/prisma/`. Because pnpm workspaces don't reliably regenerate `@prisma/client` across packages. Importing from `'@prisma/client'` will NOT work — use the relative path `'../generated/prisma/index.js'`.

4. **Generated client must be copied to dist**: The api build script does this:
   ```
   tsc && node -e "require('fs').cpSync('src/generated','dist/generated',{recursive:true})"
   ```

5. **Node version pinned to 22.x**: Node 24 has a corepack ESM bug. Don't bump.

6. **Seed runs at API startup**: `apps/api/src/lib/bootstrap.ts` creates default BotConfig if missing. Originally tried `pnpm db:seed` but tsx + Node 22 crashed with `ERR_REQUIRE_CYCLE_MODULE`.

7. **Express types**: Routes use `IRouter` annotation to dodge a pnpm `TS2742` portability error. Don't remove the type annotations.

8. **SSE auth via query param**: `EventSource` can't set headers, so `/stream` accepts the JWT via `?token=...`. Other endpoints use the `Authorization: Bearer` header.

9. **Railway uses Railpack (not Nixpacks)**: Don't add a `nixpacks.toml` — it'll be ignored.

10. **Dashboard is local-only**: `apps/web` is NOT deployed. Runs on the laptop with `pnpm dev:web` and points to the Railway API.

11. **Meta developer account is an alt**: Primary FB account is restricted from developers.facebook.com. The `tgp-bot` app lives under a secondary account. Long-term risk: if Meta connects the accounts, the alt could be flagged.

12. **Test sender is +1 555 642 6683** (Meta-provided). Only whitelisted test recipients can message it. For real customers, we need to onboard a real number via business verification (see TODO).

---

## How to resume work in a new session

### Start the dashboard
```powershell
cd C:\Users\Aravind\automations
pnpm dev:web
# Open http://localhost:3000, log in: admin@example.com / admin123
```

### Start the local API (only if testing changes before pushing)
```powershell
cd C:\Users\Aravind\automations\apps\api
node node_modules\tsx\dist\cli.mjs src/index.ts
```

### Make code changes
```powershell
git add -A
git commit -m "..."
git push
# Railway auto-deploys within ~30s
```

### Watch Railway deploys / view logs
https://railway.com → luminous-emotion → whatsapp-bot service → Deployments → View logs

### Regenerate Meta access token (when bot stops sending)
1. https://developers.facebook.com → `tgp-bot` → WhatsApp → API Setup
2. Click "Generate access token", copy
3. Railway → Variables → edit `WHATSAPP_ACCESS_TOKEN` → paste → Deploy

### Check Postgres directly (local)
```powershell
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -U postgres -d whatsapp_lead_bot
```

---

## What's NOT done — to-do list

### 🔴 Before going live with real customers

1. **Get a permanent System User access token** (replaces 24h temp token)
   - Meta Business Manager → Business settings → System users → Create new (Admin role)
   - Generate token → grant WhatsApp permissions (`whatsapp_business_messaging`, `whatsapp_business_management`)
   - Token never expires. Paste into Railway as `WHATSAPP_ACCESS_TOKEN`.

2. **Business verification** at Meta Business Manager
   - Upload business documents (PAN/GST for India, website with matching name)
   - Takes 1-3 days

3. **Onboard a real WhatsApp number**
   - Add phone number to the WABA (the actual customer-facing number)
   - OTP-verify it (must be a number with no existing WhatsApp account, or delete WhatsApp from it first)
   - Pick "The German Portal" as display name (separate ~1-2 day approval)

4. **Test the full GREEN → YELLOW → RED flow**
   - Only GREEN tested in Meta test mode. Need YELLOW and RED.

5. **Test BLUE** — confirm bot stops replying on "not interested".

6. **Customize brand voice + offers in Settings page** (currently placeholders).

7. **Change dashboard password** from `admin123`:
   ```powershell
   cd C:\Users\Aravind\automations\apps\api
   node -e "require('./node_modules/bcryptjs').hash('YOUR_NEW_PASSWORD', 12).then(h => console.log(h))"
   ```

8. **Rotate JWT_SECRET** to a 32+ char random string.

9. **Add a credit card** to Meta Business Manager for billing (Meta charges per conversation directly).

### 🟡 Nice to have (not blocking)

10. **Deploy dashboard to Railway** (currently local-only, ~$5/month extra).
11. **Handle non-text messages** (images, voice, stickers currently ignored).
12. **Re-engagement flow for BLUE leads**.
13. **Analytics page** (conversion rate, time-to-RED, classifier accuracy).
14. **CI/CD checks** — lint + typecheck on push.

---

## Quick architecture diagram

```
Customer's WhatsApp
       ↓ (1) sends message
Meta WhatsApp Cloud API (test sender: +1 555 642 6683)
       ↓ (2) POST webhook (HMAC signed)
Railway API (whatsapp-bot-production-7365.up.railway.app/webhook/whatsapp)
       ↓ (3) verify signature → classify + respond
   Groq API ←─────────────────────┐
       ↓ (4) save state            │
   Railway Postgres                │
       ↓ (5) send reply            │
Meta Graph API ←────────────────────
       ↓ (6) deliver
Customer's WhatsApp

Meanwhile:
Owner's laptop → http://localhost:3000 → HTTPS calls → Railway API → live updates via SSE
```

---

## If anything breaks

1. **Bot stops replying with "Authentication Error 190"** → access token expired. Regenerate from Meta API Setup, update Railway, redeploy.
2. **Bot stops replying with no error in logs** → check Meta dashboard → Webhook is still subscribed to `messages` field. If you redeployed and webhook URL became unreachable temporarily, Meta sometimes unsubscribes.
3. **Webhook returns 401** → signature mismatch. Verify `WHATSAPP_APP_SECRET` matches the App Secret in Meta → App settings → Basic.
4. **Dashboard can't connect** → check `apps/web/.env.local` points to right Railway URL.
5. **Login fails** → verify `DASHBOARD_USER_EMAIL` + `DASHBOARD_USER_PASSWORD_HASH` env vars on Railway match.
6. **Database connection fails** → Postgres on Railway may have restarted. Check Railway Postgres service status.

---

*Built with Claude Code over two sessions: 2026-05-21 (initial build + Gupshup wiring), 2026-05-22 (Gupshup → Meta Cloud API migration).*
