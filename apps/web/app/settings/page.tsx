'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/utils';
import type { BotConfig, Offer } from '@/lib/types';

export default function SettingsPage() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<BotConfig>('/config').then(setConfig).catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiFetch<BotConfig>('/config', {
        method: 'PATCH',
        body: JSON.stringify({
          brandName: config.brandName,
          brandVoice: config.brandVoice,
          offers: config.offers,
          instructions: config.instructions,
          ownerPhone: config.ownerPhone,
          handoffMessage: config.handoffMessage,
        }),
      });
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function updateOffer(index: number, field: keyof Offer, value: string) {
    if (!config) return;
    const offers = config.offers.map((o, i) =>
      i === index ? { ...o, [field]: value } : o
    );
    setConfig({ ...config, offers });
  }

  function addOffer() {
    if (!config) return;
    setConfig({
      ...config,
      offers: [...config.offers, { title: '', description: '', price: '', link: '' }],
    });
  }

  function removeOffer(index: number) {
    if (!config) return;
    setConfig({ ...config, offers: config.offers.filter((_, i) => i !== index) });
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg px-3 py-2 text-sm outline-none';
  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Brand
          </h2>

          <label className="block space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Brand name</span>
            <input
              className={inputClass}
              style={inputStyle}
              value={config.brandName}
              onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Brand voice</span>
            <textarea
              className={inputClass + ' resize-none'}
              style={inputStyle}
              rows={4}
              value={config.brandVoice}
              onChange={(e) => setConfig({ ...config, brandVoice: e.target.value })}
            />
          </label>
        </section>

        {/* Offers */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Offers
            </h2>
            <button
              type="button"
              onClick={addOffer}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <Plus size={12} /> Add offer
            </button>
          </div>

          {config.offers.map((offer, i) => (
            <div
              key={i}
              className="rounded-lg p-4 space-y-3"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Offer {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeOffer(i)}
                  style={{ color: 'var(--stage-red)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {(['title', 'description', 'price', 'link'] as const).map((field) => (
                <label key={field} className="block space-y-1">
                  <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{field}</span>
                  <input
                    className={inputClass}
                    style={{ ...inputStyle, background: 'var(--surface)' }}
                    value={offer[field]}
                    onChange={(e) => updateOffer(i, field, e.target.value)}
                  />
                </label>
              ))}
            </div>
          ))}
        </section>

        {/* Instructions */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Instructions
          </h2>
          <label className="block space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Do/don&apos;ts, FAQs, escalation rules
            </span>
            <textarea
              className={inputClass + ' resize-none'}
              style={inputStyle}
              rows={5}
              value={config.instructions}
              onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
            />
          </label>
        </section>

        {/* Handoff */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Handoff & Notifications
          </h2>
          <label className="block space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Handoff message (sent to lead when they go RED, before bot pauses)
            </span>
            <textarea
              className={inputClass + ' resize-none'}
              style={inputStyle}
              rows={3}
              value={config.handoffMessage}
              onChange={(e) => setConfig({ ...config, handoffMessage: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Owner WhatsApp number (for hot-lead pings, e.g. 4917612345678)
            </span>
            <input
              className={inputClass}
              style={inputStyle}
              value={config.ownerPhone}
              onChange={(e) => setConfig({ ...config, ownerPhone: e.target.value })}
              placeholder="Country code + number, no +"
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          style={{ background: 'var(--accent)', color: '#0a0f1f' }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
