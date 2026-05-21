import { Router, type IRouter, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const authRouter: IRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const { email, password } = parsed.data;
  const expectedEmail = process.env.DASHBOARD_USER_EMAIL;
  const passwordHash = process.env.DASHBOARD_USER_PASSWORD_HASH;

  if (!expectedEmail || !passwordHash) {
    res.status(500).json({ error: 'Auth not configured' });
    return;
  }

  if (email !== expectedEmail) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { sub: email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({ token });
});
