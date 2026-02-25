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
    confirmed: t.orderStatusConfirmed ?? 'Confirmed',
    preparing: t.orderStatusPreparing ?? 'Preparing',
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
  const t = translations[lang].cart;
  const tOrder = translations[lang].orderPage;
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderLookupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNoResults, setIsNoResults] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) {
      setError(t.contactPhoneMinLength);
      return;
    }
    setError(null);
    setIsNoResults(false);
    setOrders(null);
    setLoading(true);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
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
    <section id="track-order" className="cart-track-section">
      {emptyCart && (
        <div className="cart-track-empty-note">
          <p className="cart-track-empty-title">{t.cartEmpty}</p>
          <p className="cart-track-empty-sub">{t.cartEmptySub}</p>
        </div>
      )}
      <div className="cart-track-header">
        <span className="cart-track-label">{t.trackOrder}</span>
        <span className="cart-track-sub">{t.trackOrderSubline}</span>
      </div>

      <form onSubmit={handleSubmit} className="cart-track-form">
        <div className="cart-track-input-group">
          <input
            id="order-lookup-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, '').slice(0, 15));
              setError(null);
            }}
            placeholder={t.phoneNumberPlaceholder}
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

          <button type="submit" className="cart-btn-primary" disabled={loading}>
            {loading ? (lang === 'th' ? 'กำลังค้นหา...' : 'Searching...') : t.findOrder}
          </button>

          <button
            type="button"
            className="cart-btn-outline"
            onClick={() => router.push(`/${lang}/catalog`)}
          >
            {t.browseBouquetsInstead ?? t.chooseBouquet}
          </button>
        </div>
      </form>

      {orders !== null && orders.length > 0 && (
        <ul className="cart-track-order-list">
          {orders.map((order) => (
            <li key={order.orderId}>
              <Link href={`/order/${encodeURIComponent(order.orderId)}`} className="cart-track-order-link">
                <span className="cart-track-order-id">{order.orderId}</span>
                <span className="cart-track-order-status">
                  {getFulfillmentLabel(order.fulfillmentStatus, tOrder)}
                </span>
                <span className="cart-track-order-date">
                  {formatDeliveryDate(order.deliveryDate)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
        .cart-track-empty-note {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 8px;
        }
        .cart-track-empty-title {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--text-muted);
          font-style: italic;
          margin: 0 0 4px;
        }
        .cart-track-empty-sub {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
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
          display: block;
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 15px 24px;
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
        .cart-btn-outline {
          display: block;
          width: 100%;
          background: transparent;
          color: var(--accent);
          border: 1.5px solid var(--accent);
          border-radius: 50px;
          padding: 13px 24px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 0.2s;
          text-align: center;
        }
        .cart-btn-outline:hover {
          background: var(--pastel-cream);
        }
        .cart-btn-outline:active {
          background: #f0e9dc;
        }
        .cart-track-order-list {
          list-style: none;
          margin: 8px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cart-track-order-link {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          text-decoration: none;
          color: var(--text);
          transition: border-color 0.15s, background 0.15s;
        }
        .cart-track-order-link:hover {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 8%, transparent);
        }
        .cart-track-order-id {
          font-weight: 600;
          font-family: var(--font-mono, monospace);
        }
        .cart-track-order-status {
          font-size: 0.85rem;
          padding: 4px 10px;
          background: var(--surface);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }
        .cart-track-order-date {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-left: auto;
        }
      `}</style>
    </section>
  );
}
