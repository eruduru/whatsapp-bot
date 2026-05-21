'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bot, Send } from 'lucide-react';
import { apiFetch, relativeTime } from '@/lib/utils';
import { StageChip } from '@/components/StageChip';
import { SseListener } from '@/components/SseListener';
import type { Lead, Message, Stage } from '@/lib/types';

const STAGES: Stage[] = ['GREEN', 'YELLOW', 'RED', 'BLUE'];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<(Lead & { messages: Message[] }) | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLead = useCallback(async () => {
    try {
      const data = await apiFetch<Lead & { messages: Message[] }>(`/leads/${id}`);
      setLead(data);
    } catch {
      router.push('/');
    }
  }, [id, router]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lead?.messages?.length]);

  const handleSseEvent = useCallback(
    (event: { type: string; data: unknown }) => {
      const d = event.data as { leadId?: string };
      if (d.leadId === id) fetchLead();
    },
    [id, fetchLead]
  );

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    setError('');
    try {
      await apiFetch(`/leads/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: replyBody }),
      });
      setReplyBody('');
      fetchLead();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  async function patchLead(updates: Partial<Lead>) {
    setSaving(true);
    try {
      const updated = await apiFetch<Lead & { messages: Message[] }>(`/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setLead(updated);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-screen text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SseListener onEvent={handleSseEvent} />

      {/* Conversation column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Sub-header */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <Link href="/" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="font-semibold">{lead.name ?? lead.phone}</div>
            {lead.name && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {lead.phone}
              </div>
            )}
          </div>
          <div className="ml-auto">
            <StageChip stage={lead.stage} />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {lead.messages.map((msg) => {
            const isInbound = msg.direction === 'INBOUND';
            const isBot = msg.sentBy === 'BOT' && !isInbound;
            return (
              <div
                key={msg.id}
                className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
              >
                <div className="max-w-[70%]">
                  <div
                    className="rounded-2xl px-3.5 py-2 text-sm relative"
                    style={{
                      background: isInbound ? 'var(--surface)' : isBot ? '#1a2a4a' : '#1a3a2a',
                      border: `1px solid ${isInbound ? 'var(--border)' : isBot ? '#2a4a7a' : '#2a6a4a'}`,
                      color: 'var(--text)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.body}
                    {isBot && (
                      <span
                        className="absolute -bottom-4 right-1 text-xs flex items-center gap-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Bot size={9} /> bot
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs mt-5 ${isInbound ? 'text-left' : 'text-right'}`}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {relativeTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply composer */}
        <div
          className="flex-shrink-0 p-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {lead.botPaused ? null : (
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Bot is active — your reply will be sent as owner override
            </p>
          )}
          {error && (
            <p className="text-xs mb-2" style={{ color: 'var(--stage-red)' }}>
              {error}
            </p>
          )}
          <form onSubmit={sendReply} className="flex gap-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type a message…"
              rows={2}
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply(e as unknown as React.FormEvent);
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || !replyBody.trim()}
              className="px-4 rounded-lg disabled:opacity-40 flex items-center gap-1.5 text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#0a0f1f' }}
            >
              <Send size={14} />
              {sending ? '…' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* Right sidebar */}
      <aside
        className="w-72 flex-shrink-0 overflow-y-auto p-4 space-y-5"
        style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {/* Stage */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Stage
          </h3>
          <StageChip stage={lead.stage} />
          {lead.stageReason && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {lead.stageReason}
            </p>
          )}
          <select
            value={lead.stage}
            onChange={(e) => patchLead({ stage: e.target.value as Stage })}
            disabled={saving}
            className="w-full rounded-lg px-3 py-1.5 text-sm outline-none mt-1"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </section>

        {/* Bot toggle */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Bot
          </h3>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">{lead.botPaused ? '✋ Paused' : '🤖 Active'}</span>
            <button
              onClick={() => patchLead({ botPaused: !lead.botPaused })}
              disabled={saving}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50"
              style={{ background: lead.botPaused ? 'var(--border)' : 'var(--accent)' }}
            >
              <span
                className="inline-block h-3.5 w-3.5 transform rounded-full transition-transform"
                style={{
                  background: '#fff',
                  transform: lead.botPaused ? 'translateX(2px)' : 'translateX(18px)',
                }}
              />
            </button>
          </label>
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Notes
          </h3>
          <textarea
            defaultValue={lead.notes ?? ''}
            rows={4}
            placeholder="Add notes…"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onBlur={(e) => patchLead({ notes: e.target.value })}
          />
        </section>

        {/* Meta */}
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Info
          </h3>
          <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
            <p>Source: {lead.source ?? '—'}</p>
            <p>Created: {relativeTime(lead.createdAt)}</p>
            <p>Last inbound: {lead.lastInboundAt ? relativeTime(lead.lastInboundAt) : '—'}</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
