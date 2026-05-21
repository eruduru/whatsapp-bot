'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Settings, LogOut, Bot, Hand } from 'lucide-react';
import { apiFetch, relativeTime, getToken, clearToken } from '@/lib/utils';
import { StageChip } from '@/components/StageChip';
import { SseListener } from '@/components/SseListener';
import type { Lead, Message, LeadsResponse, Stage } from '@/lib/types';

const FILTERS: { label: string; value: Stage | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: '🟢 New', value: 'GREEN' },
  { label: '🟡 Enquiring', value: 'YELLOW' },
  { label: '🔴 Hot', value: 'RED' },
  { label: '🔵 Lost', value: 'BLUE' },
];

type LeadWithLastMessage = Lead & { messages: Message[] };

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadWithLastMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState<Stage | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (stage !== 'ALL') params.set('stage', stage);
      if (search) params.set('search', search);
      params.set('page', String(page));

      const data = await apiFetch<LeadsResponse>(`/leads?${params}`);
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      // handled by apiFetch (401 redirects)
    } finally {
      setLoading(false);
    }
  }, [stage, search, page]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    fetchLeads();
  }, [fetchLeads, router]);

  const handleSseEvent = useCallback(
    (event: { type: string; data: unknown }) => {
      if (
        event.type === 'lead:new' ||
        event.type === 'lead:stage_changed' ||
        event.type === 'message:new'
      ) {
        fetchLeads();
        if (event.type === 'lead:stage_changed') {
          const d = event.data as { newStage?: string };
          if (d.newStage === 'RED') {
            setToast('🔥 Hot lead arrived!');
            setTimeout(() => setToast(null), 4000);
          }
        }
      }
    },
    [fetchLeads]
  );

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <div className="flex flex-col h-screen">
      <SseListener onEvent={handleSseEvent} />

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg"
          style={{ background: 'var(--stage-red)', color: '#fff' }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
          The German Portal
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
            style={{ color: 'var(--text-muted)' }}
          >
            <Settings size={15} />
            Settings
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStage(f.value); setPage(1); }}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: stage === f.value ? 'var(--accent)' : 'var(--surface)',
                color: stage === f.value ? '#0a0f1f' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div
          className="ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search leads…"
            className="bg-transparent text-sm outline-none w-48"
            style={{ color: 'var(--text)' }}
          />
        </div>

        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {total} leads
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-muted)' }}>
            No leads found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Stage', 'Name / Phone', 'Last message', 'Last contact', 'Bot'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const lastMsg = lead.messages?.[0];
                return (
                  <tr
                    key={lead.id}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <td className="px-6 py-3.5">
                      <StageChip stage={lead.stage} />
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium">{lead.name ?? '—'}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {lead.phone}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs">
                      <p className="truncate" style={{ color: 'var(--text-muted)' }}>
                        {lastMsg?.body ?? '—'}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {lead.lastInboundAt ? relativeTime(lead.lastInboundAt) : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      {lead.botPaused ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--stage-yellow)' }}>
                          <Hand size={12} /> Paused
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--stage-green)' }}>
                          <Bot size={12} /> Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div
          className="flex items-center justify-center gap-3 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-xs rounded disabled:opacity-40"
            style={{ background: 'var(--surface)', color: 'var(--text)' }}
          >
            ← Prev
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {page} / {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-xs rounded disabled:opacity-40"
            style={{ background: 'var(--surface)', color: 'var(--text)' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
