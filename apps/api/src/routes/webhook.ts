import { Router, type IRouter, type Request, type Response } from 'express';
import { processInbound } from '../services/pipeline.js';

export const webhookRouter: IRouter = Router();

// Gupshup health check (GET)
webhookRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Gupshup webhook (POST)
// Payload shape:
// {
//   "app": "germanportalbot",
//   "timestamp": ...,
//   "version": 2,
//   "type": "message",
//   "payload": {
//     "id": "...",
//     "source": "919876543210",
//     "type": "text",
//     "payload": { "text": "Hello" },
//     "sender": { "phone": "919876543210", "name": "John" }
//   }
// }
webhookRouter.post('/', (req: Request, res: Response) => {
  res.sendStatus(200);

  const body = req.body as {
    type?: string;
    payload?: {
      id?: string;
      source?: string;
      type?: string;
      payload?: { text?: string };
      sender?: { phone?: string; name?: string };
    };
  };

  if (body.type !== 'message') return;

  const p = body.payload;
  if (!p || p.type !== 'text') return;

  const from = p.sender?.phone ?? p.source;
  const whatsappId = p.id;
  const text = p.payload?.text;
  const name = p.sender?.name;

  if (!from || !whatsappId || !text) return;

  processInbound({ from, name, body: text, whatsappId }).catch((err) =>
    console.error('Pipeline error:', err)
  );
});
