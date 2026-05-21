import OpenAI from 'openai';

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';
