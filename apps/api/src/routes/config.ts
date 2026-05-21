import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const configRouter: IRouter = Router();
configRouter.use(requireAuth);

configRouter.get('/', async (_req: Request, res: Response) => {
  const config = await prisma.botConfig.findUnique({ where: { id: 'singleton' } });
  if (!config) {
    res.status(404).json({ error: 'Config not found' });
    return;
  }
  res.json(config);
});

const offerSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.string(),
  link: z.string(),
});

const patchConfigSchema = z.object({
  brandName: z.string().optional(),
  brandVoice: z.string().optional(),
  offers: z.array(offerSchema).optional(),
  instructions: z.string().optional(),
  ownerPhone: z.string().optional(),
  handoffMessage: z.string().optional(),
});

configRouter.patch('/', async (req: Request, res: Response) => {
  const parsed = patchConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const config = await prisma.botConfig.update({
    where: { id: 'singleton' },
    data: parsed.data,
  });

  res.json(config);
});
