import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { webhookRouter } from './routes/webhook.js';
import { authRouter } from './routes/auth.js';
import { leadsRouter } from './routes/leads.js';
import { configRouter } from './routes/config.js';
import { streamRouter } from './routes/stream.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/webhook/whatsapp', webhookRouter);
app.use('/auth', authRouter);
app.use('/leads', leadsRouter);
app.use('/config', configRouter);
app.use('/stream', streamRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
