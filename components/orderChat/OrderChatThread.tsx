'use client';

import { useEffect, useRef, useState } from 'react';
import type { OrderChatMessage } from '@/lib/orderChat/types';
import { ORDER_CHAT_MAX_BODY_LENGTH } from '@/lib/orderChat/constants';

export function OrderChatThread({
  messages,
  closed,
  loading,
  error,
  selfSender,
  disclaimer,
  closedLabel,
  placeholder,
  sendLabel,
  sendingLabel,
  onSend,
}: {
  messages: OrderChatMessage[];
  closed: boolean;
  loading: boolean;
  error: string | null;
  selfSender: 'customer' | 'admin';
  disclaimer: string;
  closedLabel: string;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  onSend: (body: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || closed) return;
    setSending(true);
    try {
      const ok = await onSend(text);
      if (ok) setDraft('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="order-chat-thread">
      <p className="order-chat-disclaimer">{disclaimer}</p>
      <div className="order-chat-messages" ref={listRef} role="log" aria-live="polite">
        {loading && messages.length === 0 ? (
          <p className="order-chat-empty">…</p>
        ) : messages.length === 0 ? (
          <p className="order-chat-empty">No messages yet</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === selfSender;
            return (
              <div
                key={m.id}
                className={`order-chat-bubble-row${mine ? ' order-chat-bubble-row--mine' : ''}`}
              >
                <div className={`order-chat-bubble${mine ? ' order-chat-bubble--mine' : ''}`}>
                  <p className="order-chat-bubble-body">{m.body}</p>
                  <time className="order-chat-bubble-time" dateTime={m.createdAt}>
                    {formatChatTime(m.createdAt)}
                  </time>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error ? <p className="order-chat-error">{error}</p> : null}
      {closed ? (
        <p className="order-chat-closed">{closedLabel}</p>
      ) : (
        <form className="order-chat-composer" onSubmit={handleSubmit}>
          <textarea
            className="order-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, ORDER_CHAT_MAX_BODY_LENGTH))}
            placeholder={placeholder}
            rows={2}
            maxLength={ORDER_CHAT_MAX_BODY_LENGTH}
            disabled={sending}
            aria-label={placeholder}
          />
          <button
            type="submit"
            className="order-chat-send"
            disabled={sending || !draft.trim()}
          >
            {sending ? sendingLabel : sendLabel}
          </button>
        </form>
      )}
      <style jsx>{`
        .order-chat-thread {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: #eef2f0;
        }
        .order-chat-disclaimer {
          margin: 0;
          padding: 8px 12px;
          font-size: 0.72rem;
          line-height: 1.35;
          color: #5a655e;
          background: #e4ebe6;
          border-bottom: 1px solid #d5ddd8;
        }
        .order-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          -webkit-overflow-scrolling: touch;
        }
        .order-chat-empty {
          margin: auto;
          color: #6b756f;
          font-size: 0.9rem;
        }
        .order-chat-bubble-row {
          display: flex;
          justify-content: flex-start;
        }
        .order-chat-bubble-row--mine {
          justify-content: flex-end;
        }
        .order-chat-bubble {
          max-width: min(82%, 420px);
          padding: 8px 12px 6px;
          border-radius: 14px 14px 14px 4px;
          background: #fff;
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06);
        }
        .order-chat-bubble--mine {
          background: #d9f0df;
          border-radius: 14px 14px 4px 14px;
        }
        .order-chat-bubble-body {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 0.95rem;
          line-height: 1.4;
          color: #1a221e;
        }
        .order-chat-bubble-time {
          display: block;
          margin-top: 4px;
          font-size: 0.65rem;
          color: #7a8580;
          text-align: right;
        }
        .order-chat-error,
        .order-chat-closed {
          margin: 0;
          padding: 8px 12px;
          font-size: 0.85rem;
          color: #8a3b2a;
          background: #f8ece8;
        }
        .order-chat-closed {
          color: #4a554f;
          background: #e8ece9;
        }
        .order-chat-composer {
          display: flex;
          gap: 8px;
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
          background: #f7f9f8;
          border-top: 1px solid #d5ddd8;
          align-items: flex-end;
        }
        .order-chat-input {
          flex: 1;
          resize: none;
          border: 1px solid #c5cfc9;
          border-radius: 12px;
          padding: 10px 12px;
          font: inherit;
          font-size: 0.95rem;
          background: #fff;
          color: #1a221e;
          min-height: 44px;
          max-height: 120px;
        }
        .order-chat-input:focus {
          outline: 2px solid #7a9e88;
          outline-offset: 1px;
        }
        .order-chat-send {
          flex-shrink: 0;
          min-height: 44px;
          padding: 0 16px;
          border: none;
          border-radius: 12px;
          background: #2f5d45;
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .order-chat-send:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function formatChatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
