import type { Stage } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import { broadcast } from '../lib/sse.js';
import { classifyLead, generateReply } from './ai.js';
import { sendWhatsApp, isWithin24Hours } from './whatsapp.js';

interface InboundMessage {
  from: string;
  name?: string;
  body: string;
  whatsappId: string;
}

export async function processInbound(msg: InboundMessage): Promise<void> {
  // Upsert lead
  const lead = await prisma.lead.upsert({
    where: { phone: msg.from },
    update: {
      name: msg.name ?? undefined,
      lastInboundAt: new Date(),
    },
    create: {
      phone: msg.from,
      name: msg.name ?? null,
      lastInboundAt: new Date(),
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  // Save inbound message (idempotent via unique whatsappId)
  const existing = await prisma.message.findUnique({ where: { whatsappId: msg.whatsappId } });
  if (existing) return; // duplicate delivery

  const savedMsg = await prisma.message.create({
    data: {
      leadId: lead.id,
      direction: 'INBOUND',
      body: msg.body,
      whatsappId: msg.whatsappId,
      sentBy: 'BOT',
    },
  });

  broadcast({ type: 'message:new', data: { leadId: lead.id, message: savedMsg } });

  if (lead.botPaused) {
    broadcast({ type: 'lead:bot_paused', data: { leadId: lead.id } });
    return;
  }

  const config = await prisma.botConfig.findUnique({ where: { id: 'singleton' } });
  if (!config) {
    console.error('BotConfig not found — cannot process message');
    return;
  }

  const allMessages = await prisma.message.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: 'asc' },
  });

  // Classify
  let classification: { stage: Stage; reason: string };
  try {
    classification = await classifyLead(lead.id, allMessages, config);
  } catch (err) {
    console.error('Classifier error, keeping current stage:', err);
    return;
  }

  const oldStage = lead.stage;
  const newStage = classification.stage;

  // Persist stage update
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: { stage: newStage, stageReason: classification.reason },
  });

  if (newStage !== oldStage) {
    broadcast({ type: 'lead:stage_changed', data: { leadId: lead.id, oldStage, newStage } });
  }

  // BLUE — no auto-reply
  if (newStage === 'BLUE') return;

  // GREEN/YELLOW → RED transition
  const wasHot = ['GREEN', 'YELLOW'].includes(oldStage) && newStage === 'RED';
  if (wasHot && !updatedLead.notifiedHot) {
    // Send handoff message to lead
    try {
      if (isWithin24Hours(lead.lastInboundAt)) {
        await sendWhatsApp(lead.phone, config.handoffMessage);
        await prisma.message.create({
          data: {
            leadId: lead.id,
            direction: 'OUTBOUND',
            body: config.handoffMessage,
            sentBy: 'BOT',
          },
        });
      }
    } catch (err) {
      console.error('Failed to send handoff message:', err);
    }

    // Pause bot + mark notified
    await prisma.lead.update({
      where: { id: lead.id },
      data: { botPaused: true, notifiedHot: true },
    });

    // Ping owner
    const lastInboundBody = msg.body;
    const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3000';
    const ownerMsg = `🔥 Hot lead — bot paused\n\n${lead.name ?? 'Unknown'} (${lead.phone}) just hit RED.\n\nReason: ${classification.reason}\n\nLast message: "${lastInboundBody}"\n\nHandoff message sent. Take it from here:\n${dashboardUrl}/leads/${lead.id}`;

    if (config.ownerPhone) {
      try {
        await sendWhatsApp(config.ownerPhone, ownerMsg);
      } catch (err) {
        console.error('Failed to send owner ping:', err);
      }
    }

    broadcast({ type: 'lead:bot_paused', data: { leadId: lead.id, reason: 'RED' } });
    return;
  }

  // Normal auto-reply for GREEN/YELLOW/RED (bot not paused)
  if (newStage === 'RED') return; // already paused above or was already RED

  if (!isWithin24Hours(lead.lastInboundAt)) {
    console.warn(`Lead ${lead.id} outside 24h window — skipping auto-reply`);
    broadcast({ type: 'message:new', data: { leadId: lead.id, warning: '24h_window_exceeded' } });
    return;
  }

  let reply: string;
  try {
    reply = await generateReply(lead.id, allMessages, config);
  } catch (err) {
    console.error('Responder error:', err);
    return;
  }

  try {
    await sendWhatsApp(lead.phone, reply);
    const outMsg = await prisma.message.create({
      data: {
        leadId: lead.id,
        direction: 'OUTBOUND',
        body: reply,
        sentBy: 'BOT',
      },
    });
    broadcast({ type: 'message:new', data: { leadId: lead.id, message: outMsg } });
  } catch (err) {
    console.error('Failed to send auto-reply:', err);
  }
}
