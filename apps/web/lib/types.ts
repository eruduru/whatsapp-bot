export type Stage = 'GREEN' | 'YELLOW' | 'RED' | 'BLUE';
export type Direction = 'INBOUND' | 'OUTBOUND';
export type SentBy = 'BOT' | 'OWNER';

export interface Message {
  id: string;
  leadId: string;
  direction: Direction;
  body: string;
  whatsappId: string | null;
  sentBy: SentBy;
  createdAt: string;
}

export interface Lead {
  id: string;
  phone: string;
  name: string | null;
  stage: Stage;
  stageReason: string | null;
  source: string | null;
  botPaused: boolean;
  notifiedHot: boolean;
  notes: string | null;
  lastInboundAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface Offer {
  title: string;
  description: string;
  price: string;
  link: string;
}

export interface BotConfig {
  id: string;
  brandName: string;
  brandVoice: string;
  offers: Offer[];
  instructions: string;
  ownerPhone: string;
  handoffMessage: string;
  updatedAt: string;
}

export interface LeadsResponse {
  leads: (Lead & { messages: Message[] })[];
  total: number;
  page: number;
  pages: number;
}
