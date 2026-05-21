import { groq, MODEL } from '../lib/groq.js';
import { prisma } from '../lib/prisma.js';
import type { BotConfig, Message, Stage } from '../generated/prisma/index.js';

type ConversationMessage = Pick<Message, 'direction' | 'body' | 'createdAt'>;

function formatConversation(messages: ConversationMessage[]): string {
  return messages
    .slice(-20)
    .map((m) => {
      const ts = m.createdAt.toISOString().replace('T', ' ').slice(0, 16);
      return `[${ts} ${m.direction}] ${m.body}`;
    })
    .join('\n');
}

function formatOffers(offers: unknown): string {
  if (!Array.isArray(offers)) return '';
  return (offers as Array<{ title: string; description: string; price: string; link: string }>)
    .map((o) => `- ${o.title}: ${o.description} | Price: ${o.price} | ${o.link}`)
    .join('\n');
}

export async function classifyLead(
  leadId: string,
  messages: ConversationMessage[],
  config: BotConfig
): Promise<{ stage: Stage; reason: string }> {
  const systemPrompt = `You are a lead-stage classifier for ${config.brandName}. Read the WhatsApp conversation and output ONE stage label plus a short reason.

Stages:
- GREEN: brand new lead, hasn't engaged meaningfully (1-2 messages, just intro/hi).
- YELLOW: actively asking about offers, services, pricing, eligibility, timelines.
- RED: clear intent to proceed. Signals — asks how to sign up, asks for payment, asks to book a call, says "I want to apply/enrol/start", asks for next steps, shares documents.
- BLUE: explicitly not interested, said no, ghosted 7+ days, or chose a competitor.

Brand context:
${config.brandVoice}

Offers:
${formatOffers(config.offers)}

Owner's extra instructions:
${config.instructions}

Output JSON only, no prose, no markdown:
{ "stage": "GREEN|YELLOW|RED|BLUE", "reason": "one short sentence" }`;

  const conversationText = formatConversation(messages);
  const start = Date.now();

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversationText },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reasoning_effort: 'low' as any,
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const latencyMs = Date.now() - start;
  const raw = res.choices[0].message.content ?? '{}';

  await prisma.aiLog.create({
    data: {
      leadId,
      kind: 'classify',
      model: MODEL,
      input: { messages: conversationText },
      output: { raw },
      latencyMs,
    },
  });

  try {
    const parsed = JSON.parse(raw) as { stage: Stage; reason: string };
    const validStages: Stage[] = ['GREEN', 'YELLOW', 'RED', 'BLUE'];
    if (!validStages.includes(parsed.stage)) throw new Error('Invalid stage');
    return parsed;
  } catch {
    console.error('Classifier parse failure:', raw);
    throw new Error('Classifier returned invalid JSON');
  }
}

export async function generateReply(
  leadId: string,
  messages: ConversationMessage[],
  config: BotConfig
): Promise<string> {
  const systemPrompt = `You are the WhatsApp assistant for ${config.brandName}. You reply to leads in this voice:
${config.brandVoice}

Goals, in order:
1. Be warm and helpful, like a knowledgeable human assistant — not a chatbot.
2. Understand what the lead actually wants.
3. Match their need to one of our offers and explain it clearly.
4. Move the conversation forward — toward sharing background, eligibility, or booking next steps.
5. NEVER invent offers, prices, eligibility rules, timelines, or guarantees. If something isn't in the offers list below, say you'll have the team confirm and follow up.

Offers (the ONLY offers you can mention):
${formatOffers(config.offers)}

Owner's extra instructions:
${config.instructions}

Reply with ONLY the next WhatsApp message. No prefixes, no markdown, no "Bot:" labels. Keep it under 4 short sentences unless the lead asked for detail. Use line breaks for mobile readability. Match the lead's language — if they write in Manglish or Malayalam, reply in kind.`;

  const conversationText = formatConversation(messages);
  const start = Date.now();

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversationText },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reasoning_effort: 'low' as any,
    temperature: 0.6,
  });

  const latencyMs = Date.now() - start;
  const reply = res.choices[0].message.content ?? '';

  await prisma.aiLog.create({
    data: {
      leadId,
      kind: 'respond',
      model: MODEL,
      input: { messages: conversationText },
      output: { reply },
      latencyMs,
    },
  });

  return reply.trim();
}
