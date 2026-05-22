# Handover — for next session

**Last session ended:** 2026-05-22

---

## TL;DR

We just migrated the bot from Gupshup to **Meta WhatsApp Cloud API direct**. End-to-end test passed: WhatsApp message → Meta → Railway → Groq AI → reply back to phone ✅.

The bot is **alive but on a borrowed clock**. The Meta access token currently in Railway is a 24-hour temp token, so within a day of the last session it will start failing with `Authentication Error 190`.

---

## State right now

- ✅ Code: switched from Gupshup to Meta Cloud API. Committed and pushed (commit `36f4abc`).
- ✅ Railway: deployed. Env vars `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` all set.
- ✅ Meta: app `tgp-bot` configured. Webhook callback URL + verify token + `messages` subscription all wired.
- ✅ Working: GREEN flow tested with `hi` → bot replied.
- ❌ Not yet: YELLOW / RED / BLUE flow testing, real customer-facing number, brand voice customization.

---

## Pick up here

### 1. URGENT (within 24h of last session) — get a permanent access token
The 24h temp token will expire and the bot will stop sending replies.

**Quick fix (buy another 24h):** Meta → `tgp-bot` → WhatsApp → API Setup → click "Generate access token" → paste into Railway `WHATSAPP_ACCESS_TOKEN` → deploy.

**Permanent fix:** Generate a System User token in Meta Business Manager (Business settings → System users → Add). Grant it `whatsapp_business_messaging` + `whatsapp_business_management` permissions. Tokens from System Users never expire.

### 2. Test the other lead stages
Only GREEN is verified. From the test phone (the one whitelisted as test recipient), try:
- **YELLOW**: "What's the price?" / "Am I eligible?" — bot should answer.
- **RED**: "I want to buy" / "Where do I pay?" — bot should send the handoff message, pause itself, and 🔥 ping the owner phone (`+49 17641239849` in current BotConfig).
- **BLUE**: "not interested" / "stop messaging" — bot should go silent.

If any flow misbehaves, the AI prompt in `apps/api/src/services/ai.ts` is the place to tune.

### 3. Customize the bot's voice + offers
Open the dashboard at `localhost:3000` → Settings page. Replace the placeholder brand voice, instructions, and offers with real ones (real prices, real links). **The bot only mentions offers that are in this list** — empty list means it won't pitch anything.

### 4. Rotate the obvious test creds before going live
- `JWT_SECRET` is `tgp_dev_jwt_secret_change_me_b59f3e2c` — replace with 32+ char random.
- Dashboard password is `admin123` — regenerate bcrypt hash via `node -e "require('./node_modules/bcryptjs').hash('YOUR_NEW_PASSWORD', 12).then(h => console.log(h))"`.

### 5. The path to a real customer-facing number
The current sender is Meta's test number (`+1 555 642 6683`). Real launch needs:
1. Business verification in Meta Business Manager (1-3 day approval, needs business documents)
2. Add a real phone number to the WABA + OTP-verify it (number must have no existing WhatsApp, or delete WhatsApp from it first)
3. Display name "The German Portal" approval (1-2 day separate review)
4. Credit card on file with Meta for billing

---

## Things future-you should know (and not relearn the hard way)

- **The Meta developer account is a SECONDARY Facebook account.** The user's primary FB is restricted from `developers.facebook.com` — we worked around it by creating an alt. Don't suggest using the primary account.
- **Don't go back to Gupshup.** User had wallet/verification trauma. Switching BSPs was a deliberate decision, not a code preference. AiSensy was also considered and ruled out (campaign-only API on cheap tier, Pro plan is expensive).
- **Webhook signature verification requires the raw body**, captured in `index.ts` via `express.json({ verify: ... })`. If you ever swap to a different body parser, you'll silently break signature checks.
- **Prisma client is in `apps/api/src/generated/prisma/`**, NOT the default `@prisma/client`. Import from `'../generated/prisma/index.js'`. Build script copies it to `dist/`.
- **The user prefers short, plain-language answers.** No tables, no caveats, no "future considerations" asides. Numbered steps, one short sentence each. See `~/.claude/projects/.../memory/feedback_communication_style.md`.
- **Railway CLI auth via API token didn't work** in last session (token kept returning Unauthorized). User did vars manually via browser raw editor. If you try again, account tokens go to `RAILWAY_API_TOKEN`, project tokens go to `RAILWAY_TOKEN`.

---

## Files changed in last session (for context)

- `apps/api/src/services/whatsapp.ts` — full rewrite, Meta Graph API
- `apps/api/src/routes/webhook.ts` — full rewrite, Meta inbound format + HMAC
- `apps/api/src/index.ts` — added raw body capture for HMAC
- `.env.example` — env var names
- `PROJECT.md` — full refresh

Commit: `36f4abc — feat: switch WhatsApp BSP from Gupshup to Meta Cloud API direct`
