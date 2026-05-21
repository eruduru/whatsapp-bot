import { Router, type IRouter, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { addSseClient } from '../lib/sse.js';

export const streamRouter: IRouter = Router();

streamRouter.get('/', (req: Request, res: Response) => {
  // EventSource can't set headers — accept token via query param
  const token = (req.query.token as string) ?? req.headers.authorization?.slice(7);
  if (!token) {
    res.status(401).end();
    return;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    res.status(401).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(': connected\n\n');

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30_000);

  req.on('close', () => clearInterval(heartbeat));

  addSseClient(res);
});
