# Handover — for next session

**Last session ended:** 2026-05-22 (late evening)

---

## TL;DR

Real business number **`+91 85472 80316`** is verified in Meta and we have its Phone Number ID. Payment method is added in Meta. **Display name approval is the last gate** — once that's green, the bot can message real customers (not just whitelisted test recipients).

---

## State right now

- ✅ Code: stable. Whitespace-in-token bug fixed in `apps/api/src/services/whatsapp.ts` (uses `.replace(/\s+/g, '')` not `.trim()`).
- ✅ Railway: deployed, online. Permanent System User token in `WHATSAPP_ACCESS_TOKEN`.
- ✅ Bot replies end-to-end on Meta's test number.
- ✅ Real number `+91 85472 80316` verified. Phone Number ID: **`1112340185300992`**. WABA ID: **`2580564159082095`**.
- ✅ Payment method added in Meta.
- 🟡 Display name approval — status unknown, user needs to check WhatsApp Manager (instructions below).
- 🟡 `WHATSAPP_PHONE_NUMBER_ID` in Railway — needs to be updated to `1112340185300992` and webhook subscribed for the new number. **Status at session end: not yet confirmed done.**
- ❌ Not yet: YELLOW/RED/BLUE flow testing, brand voice + real offers in dashboard, rotated test creds.

---

## Pick up here

### 1. Confirm the Railway env var swap is done

Open Railway → whatsapp-bot service → Variables. Confirm `WHATSAPP_PHONE_NUMBER_ID = 1112340185300992`. If not, set it and let it redeploy.

### 2. Check display name status

1. Go to https://business.facebook.com/wa/manage/
2. Pick the WhatsApp Business Account (ID `2580564159082095`).
3. Sidebar → **Phone numbers** → click `+91 85472 80316`.
4. Look at the **Display name** field:
   - **Approved** → you can message any number (subject to Meta's 24h customer-care window rules).
   - **Pending Review** → wait (hours to ~2 days).
   - **None** → click Edit, submit a name (e.g. "The German Portal"), wait for review.
   - **Rejected** → reason will be shown, submit a different name.

### 3. Subscribe webhook for the new number

In Meta → tgp-bot app → WhatsApp → **Configuration** → Webhook fields → confirm `messages` is subscribed for the WhatsApp Business Account that owns `+91 85472 80316`. Webhook URL and verify token are unchanged from before.

### 4. Live test

Send a WhatsApp message to `+91 85472 80316` from another phone. Bot should reply.

Caveat: until display name is approved, you may still only be able to reach phones added as **test recipients** in Meta API Setup → "To" field whitelist. Add 1-2 numbers there if testing.

### 5. Still on the to-do list

- Test YELLOW / RED / BLUE flows:
  - YELLOW: "What's the price?" / "Am I eligible?"
  - RED: "I want to buy" / "Where do I pay?" — bot should send handoff and ping owner.
  - BLUE: "not interested" / "stop" — bot should go silent.
- Customize bot voice + real offers at dashboard `localhost:3000` → Settings.
- Rotate test creds before public launch:
  - `JWT_SECRET` (currently `tgp_dev_jwt_secret_change_me_b59f3e2c`)
  - Dashboard password (currently `admin123`)

---

## Things future-you should know

- **Phone Number IDs to remember:**
  - Real number `+91 85472 80316` → Phone Number ID `1112340185300992`
  - WABA ID → `2580564159082095`
- **`.trim()` is NOT enough for Meta env vars.** Pasted tokens can have embedded `\n` or `\r` in the middle. Always use `.replace(/\s+/g, '')` on tokens/IDs that end up in HTTP headers. Already fixed in `whatsapp.ts`.
- **The Meta developer account is a SECONDARY Facebook account.** User's primary FB is restricted from `developers.facebook.com`. Don't suggest the primary account.
- **The number `+91 85472 80316` had WhatsApp on it, deleted on 2026-05-22.** Verification eventually succeeded via Meta dashboard (after some SMS delivery friction). If issues recur, give the number 24h to fully release from regular WhatsApp.
- **SMS verification codes from Meta to Indian carriers are unreliable.** Voice call is the backup.
- **Don't go back to Gupshup.** Migration to Meta Cloud direct was deliberate.
- **Prisma client lives at `apps/api/src/generated/prisma/`**, not `@prisma/client`. Import from `'../generated/prisma/index.js'`.
- **Webhook HMAC needs raw body** — captured in `index.ts` via `express.json({ verify: ... })`. Don't swap body parsers.
- **User prefers short, plain-language answers.** No tables, no caveats, no "future considerations." Numbered steps, one short sentence each.
- **Railway builds can take 10+ min when their queue is backed up.** Empty commit (`git commit --allow-empty -m "trigger rebuild"`) is a reliable retrigger.

---

## Recent commits (this session)

- `e9e3e44` — docs: update HANDOVER for real-number onboarding in progress
- `f9a8b16` — chore: trigger rebuild (empty)
- `9a22b2c` — fix: strip all whitespace from WhatsApp env vars, not just edges
- `b7ef312` — fix: trim WhatsApp env vars to strip whitespace from copy-paste
- `fc49814` — docs: refresh PROJECT.md for Meta Cloud API direct, add HANDOVER.md
- `36f4abc` — feat: switch WhatsApp BSP from Gupshup to Meta Cloud API direct
