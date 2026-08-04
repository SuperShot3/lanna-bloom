'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderChatMessage } from '@/lib/orderChat/types';
import { ORDER_CHAT_POLL_INTERVAL_MS } from '@/lib/orderChat/constants';

type ChatFetchResult = {
  messages: OrderChatMessage[];
  closed: boolean;
  purgeAfter: string | null;
  error: string | null;
};

export function useOrderChatPoll(options: {
  enabled: boolean;
  fetchMessages: () => Promise<ChatFetchResult>;
  intervalMs?: number;
}) {
  const { enabled, fetchMessages, intervalMs = ORDER_CHAT_POLL_INTERVAL_MS } = options;
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [closed, setClosed] = useState(false);
  const [purgeAfter, setPurgeAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(fetchMessages);
  fetchRef.current = fetchMessages;

  const refresh = useCallback(async () => {
    try {
      const result = await fetchRef.current();
      setMessages(result.messages);
      setClosed(result.closed);
      setPurgeAfter(result.purgeAfter);
      setError(result.error);
    } catch {
      setError('Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      await refresh();
      if (cancelled) return;
      timer = setInterval(() => {
        void refresh();
      }, intervalMs);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [enabled, intervalMs, refresh]);

  const appendOptimistic = useCallback((message: OrderChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  return {
    messages,
    closed,
    purgeAfter,
    loading,
    error,
    refresh,
    appendOptimistic,
    setClosed,
  };
}
