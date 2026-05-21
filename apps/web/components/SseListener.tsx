'use client';

import { useEffect, useRef } from 'react';
import { API_URL, getToken } from '@/lib/utils';

interface Props {
  onEvent: (event: { type: string; data: unknown }) => void;
}

export function SseListener({ onEvent }: Props) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const url = `${API_URL}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data as string);
        onEventRef.current(parsed as { type: string; data: unknown });
      } catch {
        // ignore non-JSON heartbeat lines
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  return null;
}
