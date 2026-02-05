'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Order } from '@/lib/orders';
import type { ContactPreferenceOption } from '@/lib/orders';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function OrderDetailsView({
  order,
  detailsUrl,
  copyOrderIdLabel,
  copyLinkLabel,
  copiedLabel,
  locale = 'en',
}: {
  order: Order;
  detailsUrl: string;
  copyOrderIdLabel: string;
  copyLinkLabel: string;
  copiedLabel: string;
  locale?: Locale;
}) {
  const t = translations[locale].orderPage;
  const tCart = translations[locale].cart;
  const [copied, setCopied] = useState<'id' | 'link' | null>(null);

  const contactPreferenceLabels: Record<ContactPreferenceOption, string> = {
    phone: tCart.contactPhone,
    line: tCart.contactLine,
    whatsapp: tCart.contactWhatsApp,
    telegram: tCart.contactTelegram,
  };

  const copy = async (text: string, kind: 'id' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="order-details-view">
      <div className="order-details-section">
        <h2 className="order-details-heading">Order ID</h2>
        <p className="order-details-order-id">{order.orderId}</p>
        <button
          type="button"
          className="order-details-copy-btn"
          onClick={() => copy(order.orderId, 'id')}
          aria-label={copyOrderIdLabel}
        >
          {copied === 'id' ? copiedLabel : copyOrderIdLabel}
        </button>
      </div>
      <div className="order-details-section">
        <h2 className="order-details-heading">Details link</h2>
        <p className="order-details-url">{detailsUrl}</p>
        <button
          type="button"
          className="order-details-copy-btn"
          onClick={() => copy(detailsUrl, 'link')}
          aria-label={copyLinkLabel}
        >
          {copied === 'link' ? copiedLabel : copyLinkLabel}
        </button>
      </div>
      {order.customerName && (
        <div className="order-details-section">
          <h2 className="order-details-heading">Customer</h2>
          <p>{order.customerName}</p>
          {order.phone && <p>{order.phone}</p>}
        </div>
      )}
      {order.contactPreference && order.contactPreference.length > 0 && (
        <div className="order-details-section">
          <h2 className="order-details-heading">{t.contactPreferenceHeading}</h2>
          <p>{order.contactPreference.map((opt) => contactPreferenceLabels[opt]).join(', ')}</p>
        </div>
      )}
      <div className="order-details-section">
        <h2 className="order-details-heading">Items</h2>
        <ul className="order-details-items">
          {order.items.map((item, i) => (
            <li key={i} className="order-details-item">
              <div className="order-details-item-row">
                {item.imageUrl && (
                  <div className="order-details-item-thumb">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      width={64}
                      height={64}
                      className="order-details-item-img"
                      unoptimized={item.imageUrl.startsWith('data:')}
                    />
                  </div>
                )}
                <div className="order-details-item-text">
                  <strong>{item.bouquetTitle}</strong> — {item.size} — ฿{item.price.toLocaleString()}
                  {item.addOns.cardMessage && (
                    <span className="order-details-card-msg"> Card: {item.addOns.cardMessage}</span>
                  )}
                  {item.addOns.wrappingOption && (
                    <span className="order-details-wrapping"> Wrapping: {item.addOns.wrappingOption}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-details-section">
        <h2 className="order-details-heading">Delivery</h2>
        <p>{order.delivery.address}</p>
        {order.delivery.district && <p>District: {order.delivery.district}</p>}
        <p>Preferred time: {order.delivery.preferredTimeSlot}</p>
        {order.delivery.notes && <p>Notes: {order.delivery.notes}</p>}
      </div>
      <div className="order-details-section">
        <h2 className="order-details-heading">{t.totalsHeading}</h2>
        <p className="order-details-totals-line">
          {t.itemsTotal}: ฿{order.pricing.itemsTotal.toLocaleString()}
        </p>
        <p className="order-details-totals-line order-details-delivery-note">
          {t.deliveryCalculated}
        </p>
        <p className="order-details-totals-grand">
          <strong>
            {t.grandTotalWithDelivery.replace(
              '{amount}',
              `฿${order.pricing.itemsTotal.toLocaleString()}`
            )}
          </strong>
        </p>
      </div>
      <p className="order-details-created">Created: {new Date(order.createdAt).toLocaleString()}</p>
      <style jsx>{`
        .order-details-view {
          max-width: 560px;
          margin: 0 auto;
        }
        .order-details-section {
          margin-bottom: 24px;
        }
        .order-details-heading {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-muted);
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .order-details-order-id {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 8px;
        }
        .order-details-url {
          font-size: 0.9rem;
          word-break: break-all;
          color: var(--text);
          margin: 0 0 8px;
        }
        .order-details-copy-btn {
          padding: 8px 14px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .order-details-copy-btn:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .order-details-items {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .order-details-item {
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
          font-size: 0.95rem;
          color: var(--text);
        }
        .order-details-item:last-child {
          border-bottom: none;
        }
        .order-details-item-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .order-details-item-thumb {
          flex-shrink: 0;
          width: 64px;
          height: 64px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--pastel-cream, #f9f5f0);
        }
        .order-details-item-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .order-details-item-text {
          flex: 1;
          min-width: 0;
        }
        .order-details-card-msg,
        .order-details-wrapping {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .order-details-totals-line {
          margin: 0 0 6px;
          font-size: 0.95rem;
          color: var(--text);
        }
        .order-details-delivery-note {
          color: var(--text-muted);
          font-style: italic;
        }
        .order-details-totals-grand {
          margin: 12px 0 0;
          font-size: 1rem;
          color: var(--text);
        }
        .order-details-created {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
}
