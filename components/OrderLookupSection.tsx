'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface OrderLookupSummary {
  orderId: string;
  fulfillmentStatus: string;
  deliveryDate: string | null;
  createdAt: string;
}

function getFulfillmentLabel(status: string, t: Record<string, string>): string {
  const map: Record<string, string> = {
    new: t.orderStatusNew ?? 'New',
    accepted: t.orderStatusAccepted ?? 'Accepted',
    order_accepted: t.orderStatusAccepted ?? 'Accepted',
    confirmed: t.orderStatusConfirmed ?? 'Confirmed',
    preparing: t.orderStatusPreparing ?? 'Preparing',
    ready_for_delivery: t.orderStatusReadyForDelivery ?? 'Ready for delivery',
    out_for_delivery: t.orderStatusOutForDelivery ?? 'Out for delivery',
    ready_to_dispatch: t.orderStatusReadyToDispatch ?? 'Ready to dispatch',
    dispatched: t.orderStatusDispatched ?? 'Dispatched',
    delivered: t.orderStatusDelivered ?? 'Delivered',
    cancelled: t.orderStatusCancelled ?? 'Cancelled',
    issue: t.orderStatusIssue ?? 'Issue',
  };
  return map[status] ?? status;
}

function formatDeliveryDate(dateStr: string | null): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr ?? '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function OrderLookupSection({ lang, emptyCart }: { lang: Locale; emptyCart?: boolean }) {
  const t = translations[lang].cart as Record<string, string>;
  const tOrder = translations[lang].orderPage;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderLookupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNoResults, setIsNoResults] = useState(false);
  const router = useRouter();

  const searchingLabel = t.orderLookupSearching ?? (lang === 'th' ? 'กำลังค้นหา...' : 'Searching...');
  const contactHref = `/${lang}/contact`;

  const looksLikeOrderId = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.toUpperCase().startsWith('LB-')) return true;
    return /[A-Za-z]/.test(trimmed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError(t.orderLookupRequired ?? 'Enter your phone number or order ID');
      return;
    }
    const searchByOrderId = looksLikeOrderId(trimmed);
    const digits = trimmed.replace(/\D/g, '');
    if (searchByOrderId) {
      if (trimmed.length < 3) {
        setError(t.orderIdMinLength ?? 'Order ID should be at least 3 characters');
        return;
      }
    } else {
      if (digits.length < 8) {
        setError(t.contactPhoneMinLength);
        return;
      }
    }
    setError(null);
    setIsNoResults(false);
    setLoading(true);
    try {
      const body = searchByOrderId ? { orderId: trimmed } : { phone: digits };
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not look up orders.');
        setOrders([]);
        return;
      }
      const orderList = data.orders ?? [];
      setOrders(orderList);
      if (orderList.length === 0) {
        setIsNoResults(true);
      }
    } catch {
      setError('Could not look up orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="track-order" className={`cart-track-section ${emptyCart ? 'cart-track-section-empty' : ''}`}>
      <div className="cart-track-header">
        <span className="cart-track-label">{t.searchMyOrder ?? t.trackOrder}</span>
        <span className="cart-track-sub">
          {t.orderLookupSubline ?? t.trackOrderSubline}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="cart-track-form">
        <div className="cart-track-input-group">
          <input
            id="order-lookup-phone"
            type="text"
            inputMode="text"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder={t.orderLookupPlaceholder ?? t.phoneNumberPlaceholder}
            className="cart-track-phone-field"
            disabled={loading}
            required
            aria-label={t.enterPhone}
          />

          {(error || isNoResults) && (
            <div className="cart-track-error" role="alert">
              <svg className="cart-track-error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="cart-track-error-text">
                {isNoResults ? (
                  <><strong>{t.noOrdersFound}</strong> {t.noOrdersFoundSubline}</>
                ) : (
                  error
                )}
              </p>
            </div>
          )}

          <div className="cart-track-buttons">
            <button
              type="button"
              className="cart-btn-browse"
              onClick={() => router.push(`/${lang}/catalog`)}
            >
              {t.browseBouquetsInstead}
            </button>

            <button type="submit" className="cart-btn-primary" disabled={loading}>
              {loading ? searchingLabel : t.findOrder}
            </button>
          </div>
        </div>
      </form>

      {orders !== null && orders.length > 0 && (
        <div className="cart-track-order-list-wrap">
          {loading && (
            <div className="cart-track-order-list-overlay" aria-hidden>
              <span className="cart-track-order-list-overlay-text">
                {searchingLabel}
              </span>
            </div>
          )}
          <ul className="cart-track-order-list">
            {orders.map((order) => (
              <li key={order.orderId}>
                <div className="cart-track-order-card">
                  <div className="cart-track-order-meta">
                    <span className="cart-track-order-id">{order.orderId}</span>
                    <span className="cart-track-order-status">
                      {getFulfillmentLabel(order.fulfillmentStatus, tOrder)}
                    </span>
                    <span className="cart-track-order-date">
                      {t.orderLookupDeliveryLabel ?? 'Delivery'}: {formatDeliveryDate(order.deliveryDate)}
                    </span>
                  </div>
                  <p className="cart-track-order-received">
                    {t.orderLookupPreviewReceived ?? 'We’ve received this order.'}
                  </p>
                  <p className="cart-track-order-helper">
                    {t.orderLookupPreviewHelper ??
                      'Status preview only. Full details are in your confirmation email (private link), or contact us with your phone number or order ID.'}{' '}
                    <Link href={contactHref} className="cart-track-order-contact">
                      {t.orderLookupContactUs ?? 'Contact us'}
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="cart-track-faq">
        <summary className="cart-track-faq-summary">
          <span className="cart-track-faq-summary-label">
            {t.orderLookupFaqTitle ?? 'About order status'}
          </span>
          <svg
            className="cart-track-faq-chevron"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <dl className="cart-track-faq-list">
          <div className="cart-track-faq-item">
            <dt>{t.orderLookupFaqQ1 ?? 'Why can’t I open full order details?'}</dt>
            <dd>
              {t.orderLookupFaqA1 ??
                'Full details use a private link from your confirmation email, or the page shown right after checkout. Phone and order ID only show a status preview.'}
            </dd>
          </div>
          <div className="cart-track-faq-item">
            <dt>{t.orderLookupFaqQ2 ?? 'I didn’t add an email'}</dt>
            <dd>
              {t.orderLookupFaqA2 ??
                'Use phone or order ID here for the latest status. Message us with that phone number or order ID if you need help.'}
            </dd>
          </div>
          <div className="cart-track-faq-item">
            <dt>{t.orderLookupFaqQ3 ?? 'Where is my private link?'}</dt>
            <dd>
              {t.orderLookupFaqA3 ??
                'In the confirmation email (“View your order”). After payment, save or bookmark the order page before you leave.'}
            </dd>
          </div>
        </dl>
      </details>

      <style jsx>{`
        .cart-track-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cart-track-section-empty {
          max-width: 560px;
          margin-left: auto;
          margin-right: auto;
        }
        .cart-track-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cart-track-label {
          font-family: var(--font-serif);
          font-size: 20px;
          font-weight: 400;
          color: var(--text);
        }
        .cart-track-sub {
          font-size: 12px;
          color: var(--text-muted);
        }
        .cart-track-form {
          display: block;
        }
        .cart-track-input-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 400px;
        }
        .cart-track-buttons {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 420px) {
          .cart-track-buttons {
            flex-direction: column;
            align-items: stretch;
          }
        }
        .cart-track-phone-field {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          background: var(--bg);
          font-family: inherit;
          font-size: 15px;
          color: var(--text);
          outline: none;
          transition: border-color 0.2s;
          letter-spacing: 0.04em;
        }
        .cart-track-phone-field:focus {
          border-color: var(--accent);
        }
        .cart-track-phone-field::placeholder {
          color: var(--text-muted);
          font-size: 13px;
        }
        .cart-track-error {
          background: #fdf5ef;
          border: 1px solid #e9c9a8;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .cart-track-error-icon {
          flex-shrink: 0;
          margin-top: 1px;
          color: var(--accent);
        }
        .cart-track-error-text {
          font-size: 13px;
          color: var(--text);
          line-height: 1.5;
          margin: 0;
        }
        .cart-track-error-text strong {
          font-weight: 500;
        }
        .cart-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 14px 28px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 50px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          text-align: center;
        }
        .cart-btn-primary:hover:not(:disabled) {
          opacity: 0.9;
        }
        .cart-btn-primary:active {
          transform: scale(0.98);
        }
        .cart-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .cart-btn-browse {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--text-muted);
          border: none;
          padding: 10px 12px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          transition: color 0.2s;
          text-align: center;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .cart-btn-browse:hover {
          color: var(--accent);
        }
        .cart-track-order-list-wrap {
          position: relative;
          margin-top: 4px;
        }
        .cart-track-order-list-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--surface) 85%, transparent);
          border-radius: var(--radius);
          z-index: 1;
        }
        .cart-track-order-list-overlay-text {
          font-size: 14px;
          color: var(--text-muted);
        }
        .cart-track-order-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cart-track-order-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 16px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
        }
        .cart-track-order-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 12px;
        }
        .cart-track-order-id {
          font-weight: 600;
          font-family: var(--font-mono, monospace);
          font-size: 14px;
        }
        .cart-track-order-status {
          font-size: 0.8rem;
          padding: 3px 9px;
          background: var(--surface);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }
        .cart-track-order-date {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-left: auto;
        }
        .cart-track-order-received {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          line-height: 1.4;
        }
        .cart-track-order-helper {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.45;
        }
        .cart-track-order-helper :global(.cart-track-order-contact) {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .cart-track-order-helper :global(.cart-track-order-contact:hover) {
          opacity: 0.9;
        }
        .cart-track-faq {
          border-top: 1px solid var(--border);
          padding-top: 14px;
          margin-top: 0;
        }
        .cart-track-faq-summary {
          list-style: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 44px;
          padding: 10px 12px;
          margin: 0 -4px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          color: var(--text);
          user-select: none;
        }
        .cart-track-faq-summary::-webkit-details-marker {
          display: none;
        }
        .cart-track-faq-summary-label {
          flex: 1;
          line-height: 1.35;
        }
        .cart-track-faq-chevron {
          flex-shrink: 0;
          color: var(--text-muted);
          transition: transform 0.2s ease;
        }
        .cart-track-faq[open] .cart-track-faq-chevron {
          transform: rotate(180deg);
          color: var(--accent);
        }
        .cart-track-faq-summary:hover {
          background: color-mix(in srgb, var(--bg) 80%, transparent);
        }
        .cart-track-faq-summary:hover .cart-track-faq-chevron {
          color: var(--accent);
        }
        .cart-track-faq-list {
          margin: 4px 0 0;
          padding: 0 4px 2px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cart-track-faq-item {
          margin: 0;
        }
        .cart-track-faq-item dt {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          margin: 0 0 4px;
          line-height: 1.35;
        }
        .cart-track-faq-item dd {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </section>
  );
}
