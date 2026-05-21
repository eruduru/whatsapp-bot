import type { Response } from 'express';
import type { SseEvent } from '@whatsapp-lead-bot/shared';

const clients = new Set<Response>();

export function addSseClient(res: Response) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function broadcast(event: SseEvent) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}
