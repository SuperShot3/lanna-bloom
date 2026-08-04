'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OrderChatMessage } from '@/lib/orderChat/types';
import { OrderChatThread } from './OrderChatThread';
import { useOrderChatPoll } from './useOrderChatPoll';

export function AdminOrderChatModal({
  orderId,
  open,
  onClose,
  chatLink,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  chatLink?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/chat`, {
      cache: 'no-store',
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
  }, [orderId]);

  const { messages, closed, loading, error, appendOptimistic, setClosed, refresh } = useOrderChatPoll({
    enabled: open,
    fetchMessages,
  });

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function handleSend(body: string): Promise<boolean> {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  async function copyChatLink() {
    if (!chatLink) return;
    try {
      await navigator.clipboard.writeText(chatLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;

  return (
    <div className="admin-order-chat-backdrop" role="dialog" aria-modal="true" aria-label="Order chat">
      <div className="admin-order-chat-panel">
        <header className="admin-order-chat-header">
          <div>
            <h2 className="admin-order-chat-title">Chat · {orderId}</h2>
            <p className="admin-order-chat-hint">
              Temporary chat — history is deleted 2 hours after delivery.
            </p>
          </div>
          <div className="admin-order-chat-actions">
            {chatLink ? (
              <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={copyChatLink}>
                {copied ? 'Copied' : 'Copy chat link'}
              </button>
            ) : null}
            <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="admin-order-chat-body">
          <OrderChatThread
            messages={messages}
            closed={closed}
            loading={loading}
            error={error}
            selfSender="admin"
            disclaimer="This chat is temporary. Message history is permanently deleted 2 hours after delivery."
            closedLabel="Chat closed — history has been deleted."
            placeholder="Reply to customer…"
            sendLabel="Send"
            sendingLabel="Sending…"
            onSend={handleSend}
          />
        </div>
      </div>
      <style jsx>{`
        .admin-order-chat-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(20, 28, 24, 0.45);
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 0;
        }
        .admin-order-chat-panel {
          width: min(520px, 100%);
          height: 100%;
          max-height: 100dvh;
          background: #fff;
          display: flex;
          flex-direction: column;
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.2);
        }
        .admin-order-chat-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8e4;
          background: #f7f9f8;
        }
        .admin-order-chat-title {
          margin: 0 0 4px;
          font-size: 1.05rem;
        }
        .admin-order-chat-hint {
          margin: 0;
          font-size: 0.78rem;
          color: #5a655e;
        }
        .admin-order-chat-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }
        .admin-order-chat-body {
          flex: 1;
          min-height: 0;
        }
        @media (min-width: 640px) {
          .admin-order-chat-backdrop {
            align-items: center;
            padding: 24px;
          }
          .admin-order-chat-panel {
            height: min(720px, 92dvh);
            border-radius: 12px;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
}
