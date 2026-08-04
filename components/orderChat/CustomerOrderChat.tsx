'use client';

import { useCallback, useEffect } from 'react';
import type { OrderChatMessage } from '@/lib/orderChat/types';
import { OrderChatThread } from './OrderChatThread';
import { useOrderChatPoll } from './useOrderChatPoll';

type Labels = {
  title: string;
  backToOrder: string;
  disclaimer: string;
  closed: string;
  placeholder: string;
  send: string;
  sending: string;
};

export function CustomerOrderChat({
  orderId,
  publicToken,
  open,
  onClose,
  labels,
}: {
  orderId: string;
  publicToken: string;
  open: boolean;
  onClose: () => void;
  labels: Labels;
}) {
  const fetchMessages = useCallback(async () => {
    const qs = new URLSearchParams({ token: publicToken });
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/chat?${qs}`, {
      cache: 'no-store',
      headers: { 'x-order-token': publicToken },
    });
    if (res.status === 410) {
      const data = (await res.json().catch(() => null)) as { purgeAfter?: string | null } | null;
      return {
        messages: [] as OrderChatMessage[],
        closed: true,
        purgeAfter: data?.purgeAfter ?? null,
        error: null,
      };
    }
    if (!res.ok) {
      return {
        messages: [] as OrderChatMessage[],
        closed: false,
        purgeAfter: null,
        error: 'Could not load chat',
      };
    }
    const data = (await res.json()) as {
      messages?: OrderChatMessage[];
      closed?: boolean;
      purgeAfter?: string | null;
    };
    return {
      messages: data.messages ?? [],
      closed: Boolean(data.closed),
      purgeAfter: data.purgeAfter ?? null,
      error: null,
    };
  }, [orderId, publicToken]);

  const { messages, closed, loading, error, appendOptimistic, setClosed } = useOrderChatPoll({
    enabled: open,
    fetchMessages,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleSend(body: string): Promise<boolean> {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-order-token': publicToken,
      },
      body: JSON.stringify({ body }),
    });
    if (res.status === 410) {
      setClosed(true);
      return false;
    }
    if (!res.ok) return false;
    const data = (await res.json()) as { message?: OrderChatMessage };
    if (data.message) appendOptimistic(data.message);
    return true;
  }

  if (!open) return null;

  return (
    <div className="order-chat-popup-root">
      <button
        type="button"
        className="order-chat-popup-backdrop"
        aria-label={labels.backToOrder}
        onClick={onClose}
      />
      <div
        className="order-chat-popup"
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
      >
        <header className="order-chat-popup-header">
          <div className="order-chat-popup-heading">
            <span className="order-chat-popup-emoji" aria-hidden>
              💬
            </span>
            <h2 className="order-chat-popup-title">{labels.title}</h2>
          </div>
          <button
            type="button"
            className="order-chat-popup-close"
            onClick={onClose}
            aria-label={labels.backToOrder}
          >
            ×
          </button>
        </header>
        <div className="order-chat-popup-body">
          <OrderChatThread
            messages={messages}
            closed={closed}
            loading={loading}
            error={error}
            selfSender="customer"
            disclaimer={labels.disclaimer}
            closedLabel={labels.closed}
            placeholder={labels.placeholder}
            sendLabel={labels.send}
            sendingLabel={labels.sending}
            onSend={handleSend}
          />
        </div>
      </div>
      <style jsx>{`
        .order-chat-popup-root {
          position: fixed;
          inset: 0;
          z-index: 80;
          pointer-events: none;
        }
        .order-chat-popup-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          padding: 0;
          margin: 0;
          background: rgba(20, 28, 24, 0.28);
          cursor: pointer;
          pointer-events: auto;
        }
        .order-chat-popup {
          position: absolute;
          right: 16px;
          bottom: 16px;
          width: min(400px, calc(100vw - 24px));
          height: min(560px, calc(100dvh - 32px));
          max-height: calc(100dvh - 24px);
          display: flex;
          flex-direction: column;
          background: #eef2f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
          pointer-events: auto;
        }
        .order-chat-popup-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 12px 12px 14px;
          background: #2f5d45;
          color: #fff;
          flex-shrink: 0;
        }
        .order-chat-popup-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .order-chat-popup-emoji {
          font-size: 1.15rem;
          line-height: 1;
        }
        .order-chat-popup-title {
          margin: 0;
          font-size: 0.98rem;
          font-weight: 700;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .order-chat-popup-close {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          font-size: 1.45rem;
          line-height: 1;
          cursor: pointer;
        }
        .order-chat-popup-close:hover {
          background: rgba(255, 255, 255, 0.24);
        }
        .order-chat-popup-body {
          flex: 1;
          min-height: 0;
        }
        @media (max-width: 520px) {
          .order-chat-popup {
            right: 10px;
            left: 10px;
            bottom: 10px;
            width: auto;
            height: min(72dvh, 560px);
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
  );
}
