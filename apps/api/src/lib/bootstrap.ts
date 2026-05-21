import { prisma } from './prisma.js';

const DEFAULT_HANDOFF =
  'Brilliant — let me hand this over to our team. Someone from The German Portal will reach out personally within a few hours to walk you through the next steps. 🙌';

export async function ensureBotConfig(): Promise<void> {
  const existing = await prisma.botConfig.findUnique({ where: { id: 'singleton' } });
  if (existing) return;

  await prisma.botConfig.create({
    data: {
      id: 'singleton',
      brandName: 'The German Portal',
      brandVoice:
        'We are warm, professional, and knowledgeable. We speak clearly and encourage leads without being pushy. We are the trusted bridge between ambitious professionals and their German career dreams.',
      offers: [
        {
          title: 'Germany Work Visa Consultation',
          description: 'One-on-one consultation to assess your eligibility and guide your visa application.',
          price: '€149',
          link: 'https://thegermanportal.com/consultation',
        },
      ],
      instructions:
        'Always greet leads warmly. Never promise specific processing times. If unsure about eligibility, say the team will assess personally. Do not discuss competitor services.',
      ownerPhone: '',
      handoffMessage: DEFAULT_HANDOFF,
    },
  });
  console.log('Bootstrapped default BotConfig');
}
