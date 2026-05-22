# Handover — for next session

**Last session ended:** 2026-05-22 (evening)

---

## TL;DR

The bot works end-to-end with a permanent token. We're now in the middle of **switching the sender from Meta's test number to the real number `+91 85472 80316`**. The phone number has been added to the WhatsApp app in Meta — we're waiting on the SMS verification code, which hadn't arrived when the session ended.

---

## State right now

- ✅ Code: stable. Whitespace-in-token bug fixed (`apps/api/src/services/whatsapp.ts` now uses `.replace(/\s+/g, '')` instead of `.trim()` — embedded newlines from copy-paste were breaking the Authorization header). Pushed as `9a22b2c`.
- ✅ Railway: deployed, online. All env vars set with clean values.
- ✅ Meta token: **permanent System User token** is in Railway. No more 24h expiry.
- ✅ End-to-end test: WhatsApp message → bot reply works on the test number.
- 🟡 Real number: `+91 85472 80316` added in Meta API Setup, SMS verification code did not arrive. 55-minute retry timer was running at end of session.
- ❌ Not yet: phone display name set, webhook subscribed to new number, Phone Number ID updated in Railway.

---

## Pick up here

### 1. Finish verifying the real number `+91 85472 80316`

The SMS code never came. When you come back:

1. Go to Meta → tgp-bot app → WhatsApp → **API Setup**.
2. Open the phone number's verification dialog.
3. If the 55-min timer is up, click **"enter a different number"** to reset, then re-add `+91 85472 80316`.
4. This time pick **voice call verification** instead of SMS — Indian carrier SMS is unreliable for Meta verification codes.
5. Answer the call, listen for the 6-digit code, enter it.

If voice call also fails, troubleshooting checklist:
- The user already deleted WhatsApp from this number — that's done, not the issue.
- Confirm the number can receive normal SMS/calls from other senders (rule out carrier-side block).
- Try again after a few hours — Meta sometimes rate-limits silently per number.

### 2. After verification — set display name

Meta will ask for a **display name** for the number. This is what recipients see. Pick something like "The German Portal" (matches the brand). Meta has to approve it — takes a few minutes to a few hours.

### 3. Wire the new number into the bot

Once verified:

1. In Meta API Setup, copy the **Phone Number ID** for the new number (it's a long numeric string, NOT the phone number itself).
2. Open Railway → whatsapp-bot service → Variables → edit `WHATSAPP_PHONE_NUMBER_ID` → paste the new ID → save.
3. Railway will auto-redeploy.
4. In Meta API Setup → **Webhooks** → make sure the new number is subscribed to `messages` events (same webhook URL and verify token as before).
5. Send a WhatsApp message to `+91 85472 80316` from a different phone. Bot should reply.

### 4. Still on the to-do list (from previous handover, not done yet)

- Test YELLOW / RED / BLUE flows (only GREEN was tested).
  - YELLOW: "What's the price?" / "Am I eligible?"
  - RED: "I want to buy" / "Where do I pay?" — bot should send handoff and ping owner.
  - BLUE: "not interested" / "stop" — bot should go silent.
- Customize bot voice + real offers at dashboard `localhost:3000` → Settings.
- Rotate test creds before public launch:
  - `JWT_SECRET` (currently `tgp_dev_jwt_secret_change_me_b59f3e2c`)
  - Dashboard password (currently `admin123`)
- Add payment method in Meta (required for sending to numbers outside the test recipient list).

---

## Things future-you should know

- **`.trim()` is NOT enough for Meta env vars.** Pasted tokens can have embedded `\n` or `\r` in the middle — Railway preserves them. Always use `.replace(/\s+/g, '')` on tokens/IDs that go into HTTP headers. Already fixed in `whatsapp.ts`.
- **The Meta developer account is a SECONDARY Facebook account.** User's primary FB is restricted from `developers.facebook.com`. Don't suggest the primary account.
- **The number `+91 85472 80316` had WhatsApp on it, deleted today (2026-05-22).** Should not interfere with Cloud API onboarding, but if Meta acts weird, give it 24 hours for the number to fully release from regular WhatsApp.
- **Don't go back to Gupshup.** Migration to Meta Cloud direct was deliberate.
- **Prisma client lives at `apps/api/src/generated/prisma/`**, not `@prisma/client`. Import from `'../generated/prisma/index.js'`.
- **Webhook HMAC needs raw body** — captured in `index.ts` via `express.json({ verify: ... })`. Don't swap body parsers.
- **User prefers short, plain-language answers.** No tables, no caveats, no "future considerations." Numbered steps, one short sentence each.
- **Railway builds can take 10+ min when their queue is backed up.** Empty commit (`git commit --allow-empty -m "trigger rebuild"`) is a reliable way to retrigger.

---

## Recent commits (this session)

- `f9a8b16` — chore: trigger rebuild (empty)
- `9a22b2c` — fix: strip all whitespace from WhatsApp env vars, not just edges
- `b7ef312` — fix: trim WhatsApp env vars to strip whitespace from copy-paste
- `fc49814` — docs: refresh PROJECT.md for Meta Cloud API direct, add HANDOVER.md
- `36f4abc` — feat: switch WhatsApp BSP from Gupshup to Meta Cloud API direct
