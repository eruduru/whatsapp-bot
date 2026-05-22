import { Router, type IRouter, type Request, type Response } from 'express';
import crypto from 'crypto';
import { processInbound } from '../services/pipeline.js';

export const webhookRouter: IRouter = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? '';

// Meta verification handshake (GET)
webhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(String(challenge));
    return;
  }
  res.sendStatus(403);
});

function verifySignature(req: Request): boolean {
  if (!APP_SECRET) return true;
  const signature = req.header('x-hub-signature-256');
  if (!signature) return false;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Meta webhook (POST)
// Payload shape (text message):
// {
//   entry: [{
//     changes: [{
//       value: {
//         messaging_product: 'whatsapp',
//         metadata: { phone_number_id, display_phone_number },
//         contacts: [{ wa_id, profile: { name } }],
//         messages: [{ from, id, timestamp, type: 'text', text: { body } }]
//       },
//       field: 'messages'
//     }]
//   }]
// }
webhookRouter.post('/', (req: Request, res: Response) => {
  if (!verifySignature(req)) {
    console.warn('Webhook signature mismatch');
    res.sendStatus(401);
    return;
  }

  res.sendStatus(200);

  const body = req.body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from?: string;
            id?: string;
            type?: string;
            text?: { body?: string };
          }>;
          contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        };
        field?: string;
      }>;
    }>;
  };

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const messages = change.value?.messages ?? [];
      const contacts = change.value?.contacts ?? [];

      for (const m of messages) {
        if (m.type !== 'text') continue;

        const from = m.from;
        const whatsappId = m.id;
        const text = m.text?.body;
        const name = contacts.find((c) => c.wa_id === from)?.profile?.name;

        if (!from || !whatsappId || !text) continue;

        processInbound({ from, name, body: text, whatsappId }).catch((err) =>
          console.error('Pipeline error:', err)
        );
      }
    }
  }
});
