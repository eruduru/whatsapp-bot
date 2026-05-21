const API_KEY = process.env.GUPSHUP_API_KEY!;
const APP_NAME = process.env.GUPSHUP_APP_NAME!;
const SOURCE = process.env.GUPSHUP_SOURCE_NUMBER!;

export async function sendWhatsApp(toPhone: string, text: string): Promise<void> {
  const params = new URLSearchParams({
    channel: 'whatsapp',
    source: SOURCE,
    destination: toPhone,
    message: JSON.stringify({ type: 'text', text }),
    'src.name': APP_NAME,
  });

  const res = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: API_KEY,
      'Cache-Control': 'no-cache',
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { status?: string; message?: string };
  if (data.status !== 'submitted') {
    throw new Error(`Gupshup send failed: ${JSON.stringify(data)}`);
  }
}

export function isWithin24Hours(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - lastInboundAt.getTime() < 24 * 60 * 60 * 1000;
}
