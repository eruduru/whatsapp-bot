import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { sendWhatsApp, isWithin24Hours } from '../services/whatsapp.js';
import { broadcast } from '../lib/sse.js';

export const leadsRouter: IRouter = Router();
leadsRouter.use(requireAuth);

const PAGE_SIZE = 30;

leadsRouter.get('/', async (req: Request, res: Response) => {
  const stage = typeof req.query.stage === 'string' ? req.query.stage : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const page = Math.max(1, parseInt(typeof req.query.page === 'string' ? req.query.page : '1') || 1);

  const where = {
    ...(stage ? { stage: stage as 'GREEN' | 'YELLOW' | 'RED' | 'BLUE' } : {}),
    ...(search
      ? {
          OR: [
            { phone: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [
        // RED/hot leads pinned at top
        { stage: 'asc' },
        { lastInboundAt: { sort: 'desc', nulls: 'last' } },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ leads, total, page, pages: Math.ceil(total / PAGE_SIZE) });
});

leadsRouter.get('/:id', async (req: Request, res: Response) => {
  const lead = await prisma.lead.findUnique({
    where: { id: String(req.params.id) },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!lead) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(lead);
});

const patchLeadSchema = z.object({
  name: z.string().optional(),
  botPaused: z.boolean().optional(),
  notes: z.string().optional(),
  stage: z.enum(['GREEN', 'YELLOW', 'RED', 'BLUE']).optional(),
});

leadsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = patchLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const lead = await prisma.lead.update({
    where: { id: String(req.params.id) },
    data: parsed.data,
  });

  broadcast({ type: 'lead:stage_changed', data: { leadId: lead.id } });
  res.json(lead);
});

leadsRouter.post('/:id/messages', async (req: Request, res: Response) => {
  const { body } = req.body as { body: string };
  if (!body?.trim()) {
    res.status(400).json({ error: 'body required' });
    return;
  }

  const lead = await prisma.lead.findUnique({ where: { id: String(req.params.id) } });
  if (!lead) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (!isWithin24Hours(lead.lastInboundAt)) {
    res.status(422).json({
      error: '24h window exceeded — cannot send free-form message',
      lastInboundAt: lead.lastInboundAt,
    });
    return;
  }

  await sendWhatsApp(lead.phone, body);

  const message = await prisma.message.create({
    data: {
      leadId: lead.id,
      direction: 'OUTBOUND',
      body,
      sentBy: 'OWNER',
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { updatedAt: new Date() },
  });

  broadcast({ type: 'message:new', data: { leadId: lead.id, message } });
  res.status(201).json(message);
});
