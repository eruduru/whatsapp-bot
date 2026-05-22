const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!.replace(/\s+/g, '');
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!.replace(/\s+/g, '');
const GRAPH_VERSION = (process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0').replace(/\s+/g, '');

export async function sendWhatsApp(toPhone: string, text: string): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  });

  const data = (await res.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message: string; code: number; type: string };
  };

  if (!res.ok || data.error) {
    throw new Error(`Meta send failed: ${JSON.stringify(data.error ?? data)}`);
  }
}

export function isWithin24Hours(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - lastInboundAt.getTime() < 24 * 60 * 60 * 1000;
}
