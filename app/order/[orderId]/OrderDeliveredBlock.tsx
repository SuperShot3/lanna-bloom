'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  OrderLifecycleStatusSection,
  type DriverAssignmentStatus,
  type OrderStatusTimestamps,
} from '@/components/order/OrderLifecycleStatus';
import { CustomerOrderChat } from '@/components/orderChat/CustomerOrderChat';
import type { Locale } from '@/lib/i18n';

type OrderPageT = {
  deliveredTitle: string;
  deliveredSubtext: string;
  deliveredContact: string;
  orderIdLabel: string;
  goToHome: string;
  copyOrderId: string;
  copied: string;
  chatWithLannaBloom?: string;
  chatTitle?: string;
  chatBackToOrder?: string;
  chatDisclaimer?: string;
  chatClosed?: string;
  chatPlaceholder?: string;
  chatSend?: string;
  chatSending?: string;
};

export function OrderDeliveredBlock({
  orderId,
  t,
  locale,
  statusTimestamps,
  driverAssignmentStatus = 'not_assigned',
  driverName,
  deliveryNotes,
  orderChatEnabled = false,
  publicToken,
  initialChatOpen = false,
}: {
  orderId: string;
  t: OrderPageT;
  locale: Locale;
  statusTimestamps: OrderStatusTimestamps;
  driverAssignmentStatus?: DriverAssignmentStatus;
  driverName?: string | null;
  deliveryNotes?: string | null;
  orderChatEnabled?: boolean;
  publicToken?: string;
  initialChatOpen?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(
    Boolean(initialChatOpen && orderChatEnabled && publicToken)
  );

  const copyId = () => {
    try {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const chatLabels = {
    cta: t.chatWithLannaBloom ?? 'Chat with Lanna Bloom',
    title: t.chatTitle ?? 'Chat with Lanna Bloom',
    backToOrder: t.chatBackToOrder ?? 'Order details',
    disclaimer:
      t.chatDisclaimer ??
      'This chat is temporary. Message history is permanently deleted 2 hours after delivery.',
    closed: t.chatClosed ?? 'This chat has closed. Message history was permanently deleted.',
    placeholder: t.chatPlaceholder ?? 'Type a message…',
    send: t.chatSend ?? 'Send',
    sending: t.chatSending ?? 'Sending…',
  };

  return (
    <div className="not-found">
      <h1 className="not-found-title">{t.deliveredTitle}</h1>
      <p className="not-found-text">{t.deliveredSubtext}</p>
      <OrderLifecycleStatusSection
        currentStatus="delivered"
        statusTimestamps={statusTimestamps}
        driverAssignmentStatus={driverAssignmentStatus}
        driverName={driverName}
        deliveryNotes={deliveryNotes}
        locale={locale}
      />
      {orderChatEnabled && publicToken ? (
        <button
          type="button"
          className="order-delivered-chat-cta"
          onClick={() => setChatOpen(true)}
        >
          <span aria-hidden>💬</span> {chatLabels.cta}
        </button>
      ) : null}
      <div className="order-not-found-id-block">
        <span className="order-not-found-id-label">{t.orderIdLabel}</span>
        <code className="order-not-found-id">{orderId}</code>
        <button
          type="button"
          onClick={copyId}
          className="order-not-found-copy"
          aria-label={t.copyOrderId}
        >
          {copied ? t.copied : t.copyOrderId}
        </button>
      </div>
      <p className="not-found-text order-not-found-contact">{t.deliveredContact}</p>
      <Link href={`/${locale}`} className="not-found-link">
        {t.goToHome}
      </Link>
      {orderChatEnabled && publicToken ? (
        <CustomerOrderChat
          orderId={orderId}
          publicToken={publicToken}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          labels={chatLabels}
        />
      ) : null}
      <style jsx>{`
        .order-delivered-chat-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          max-width: 420px;
          margin: 0 auto 16px;
          min-height: 48px;
          border: none;
          border-radius: 12px;
          background: #2f5d45;
          color: #fff;
          font: inherit;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
        }
        .order-delivered-chat-cta:hover {
          background: #264d39;
        }
        .order-not-found-id-block {
          margin: 16px 0;
          padding: 14px 16px;
          background: var(--pastel-cream, #f5f0e8);
          border-radius: var(--radius-sm, 8px);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 16px;
        }
        .order-not-found-id-label {
          font-weight: 600;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .order-not-found-id {
          font-family: ui-monospace, monospace;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          word-break: break-all;
          min-width: 0;
        }
        .order-not-found-copy {
          margin-left: auto;
          padding: 10px 16px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          background: transparent;
          border: 2px solid var(--accent);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          flex-shrink: 0;
        }
        .order-not-found-copy:hover {
          background: var(--accent-soft);
          color: var(--text);
        }
        .order-not-found-contact {
          margin-bottom: 20px;
        }
        @media (max-width: 480px) {
          .order-not-found-id-block {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .order-not-found-copy {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
