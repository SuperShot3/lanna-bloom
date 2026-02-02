'use client';

import { useState } from 'react';
import Link from 'next/link';

type OrderPageT = {
  notFound: string;
  notFoundSubtext: string;
  notFoundContact: string;
  orderIdLabel: string;
  goToHome: string;
  copyOrderId: string;
  copied: string;
};

export function OrderNotFoundBlock({
  orderId,
  t,
  locale,
}: {
  orderId: string;
  t: OrderPageT;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    try {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="not-found">
      <h1 className="not-found-title">{t.notFound}</h1>
      <p className="not-found-text">{t.notFoundSubtext}</p>
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
      <p className="not-found-text order-not-found-contact">{t.notFoundContact}</p>
      <Link href={`/${locale}`} className="not-found-link">
        {t.goToHome}
      </Link>
      <style jsx>{`
        .order-not-found-id-block {
          margin: 16px 0;
          padding: 12px 16px;
          background: var(--pastel-cream, #f5f0e8);
          border-radius: var(--radius-sm, 8px);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .order-not-found-id-label {
          font-weight: 600;
          color: var(--text-muted);
        }
        .order-not-found-id {
          font-family: ui-monospace, monospace;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }
        .order-not-found-copy {
          margin-left: auto;
          padding: 6px 12px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          background: transparent;
          border: 2px solid var(--accent);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .order-not-found-copy:hover {
          background: var(--accent-soft);
          color: var(--text);
        }
        .order-not-found-contact {
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
