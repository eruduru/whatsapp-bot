import 'dotenv/config';
import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

const conversations = [
  {
    label: 'GREEN — just said hi',
    messages: '[2026-05-21 09:00 INBOUND] Hi',
  },
  {
    label: 'YELLOW — asking about price',
    messages: '[2026-05-21 09:00 INBOUND] Hi\n[2026-05-21 09:01 OUTBOUND] Hello! How can I help?\n[2026-05-21 09:02 INBOUND] How much does the Germany work visa consultation cost?',
  },
  {
    label: 'RED — wants to sign up',
    messages: '[2026-05-21 09:00 INBOUND] Hi\n[2026-05-21 09:01 OUTBOUND] Hello! How can I help?\n[2026-05-21 09:02 INBOUND] I want to apply for the Germany visa. How do I sign up?',
  },
  {
    label: 'BLUE — not interested',
    messages: '[2026-05-21 09:00 INBOUND] Hi\n[2026-05-21 09:01 OUTBOUND] Hello! How can I help?\n[2026-05-21 09:02 INBOUND] No thanks, I found another service',
  },
  {
    label: 'RED — asking for payment link',
    messages: '[2026-05-21 09:00 INBOUND] Hi\n[2026-05-21 09:05 OUTBOUND] Hi! We help with Germany work visas.\n[2026-05-21 09:10 INBOUND] OK I am interested\n[2026-05-21 09:11 OUTBOUND] Great, tell me about your background.\n[2026-05-21 09:15 INBOUND] I am a software engineer with 5 years experience. Can you send the payment link?',
  },
];

const systemPrompt = `You are a lead-stage classifier for The German Portal. Read the WhatsApp conversation and output ONE stage label plus a short reason.

Stages:
- GREEN: brand new lead, hasn't engaged meaningfully (1-2 messages, just intro/hi).
- YELLOW: actively asking about offers, services, pricing, eligibility, timelines.
- RED: clear intent to proceed. Signals — asks how to sign up, asks for payment, asks to book a call, says "I want to apply/enrol/start", asks for next steps, shares documents.
- BLUE: explicitly not interested, said no, ghosted 7+ days, or chose a competitor.

Output JSON only, no prose, no markdown:
{ "stage": "GREEN|YELLOW|RED|BLUE", "reason": "one short sentence" }`;

console.log('Testing classifier with 5 conversations...\n');

for (const conv of conversations) {
  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conv.messages },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reasoning_effort: 'low' as any,
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const result = res.choices[0].message.content ?? '{}';
  console.log(`[${conv.label}]`);
  console.log(`  Result: ${result}`);
  console.log();
}
