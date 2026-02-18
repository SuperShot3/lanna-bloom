'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShareIcon } from '@/components/icons';
import type { Order } from '@/lib/orders';
import type { ContactPreferenceOption } from '@/lib/orders';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/** Parse preferredTimeSlot: "2025-02-15 09:00-10:00" -> { date, time } or legacy format. */
function parsePreferredTimeSlot(slot: string): { date: string; time: string } {
  const parts = slot.trim().split(/\s+/);
  if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) && parts[1].includes('-')) {
    return { date: parts[0], time: parts[1] };
  }
  return { date: slot, time: '' };
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function OrderDetailsView({
  order,
  detailsUrl,
  baseUrl,
  copyOrderIdLabel,
  copyLinkLabel,
  copiedLabel,
  locale = 'en',
}: {
  order: Order;
  detailsUrl: string;
  baseUrl: string;
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

  const { date: deliveryDate, time: preferredTime } = parsePreferredTimeSlot(
    order.delivery.preferredTimeSlot || ''
  );

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

      {/* Delivery date & time */}
      <div className="order-details-section">
        <h2 className="order-details-heading">{t.deliveryDate}</h2>
        <p className="order-details-value">{formatDisplayDate(deliveryDate) || '—'}</p>
      </div>
      {preferredTime && (
        <div className="order-details-section">
          <h2 className="order-details-heading">{t.preferredTime}</h2>
          <p className="order-details-value">{preferredTime}</p>
        </div>
      )}

      {/* Delivery address */}
      <div className="order-details-section">
        <h2 className="order-details-heading">{t.address}</h2>
        <p className="order-details-value">{order.delivery.address || '—'}</p>
        {order.delivery.deliveryGoogleMapsUrl && (
          <>
            <p className="order-details-gmaps-wrap">
              <a
                href={order.delivery.deliveryGoogleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="order-details-gmaps-btn"
              >
                {t.openInGoogleMaps}
              </a>
            </p>
            <p className="order-details-link-line">
              <span className="order-details-link-label">{t.googleMapLink}: </span>
              <a
                href={order.delivery.deliveryGoogleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="order-details-link-url"
              >
                {order.delivery.deliveryGoogleMapsUrl}
              </a>
            </p>
          </>
        )}
      </div>

      {/* Recipient */}
      {(order.delivery.recipientName || order.delivery.recipientPhone) && (
        <div className="order-details-section">
          <h2 className="order-details-heading">{t.recipientName}</h2>
          <p className="order-details-value">{order.delivery.recipientName || '—'}</p>
          {order.delivery.recipientPhone && (
            <p className="order-details-value">{t.recipientPhone}: {order.delivery.recipientPhone}</p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="order-details-section">
        <h2 className="order-details-heading">{t.item}</h2>
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
                  {item.addOns.wrappingOption && (
                    <span className="order-details-meta"> {t.wrapping}: {item.addOns.wrappingOption}</span>
                  )}
                  {item.addOns.cardMessage && (
                    <span className="order-details-meta"> {t.cardMessage}: {item.addOns.cardMessage}</span>
                  )}
                </div>
              </div>
              {item.bouquetSlug && (
                <>
                  <Link
                    href={`${baseUrl}/${locale}/catalog/${item.bouquetSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="order-details-share-btn"
                  >
                    <ShareIcon size={18} className="order-details-share-icon" />
                    <span>{t.shareFlower}</span>
                  </Link>
                  <p className="order-details-link-line">
                    <span className="order-details-link-label">{t.linkToFlower}: </span>
                    <a
                      href={`${baseUrl}/${locale}/catalog/${item.bouquetSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="order-details-link-url"
                    >
                      {`${baseUrl}/${locale}/catalog/${item.bouquetSlug}`}
                    </a>
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Price summary */}
      <div className="order-details-section">
        <h2 className="order-details-heading">{t.totalsHeading}</h2>
        <p className="order-details-totals-line">
          {t.bouquetPrice}: ฿{order.pricing.itemsTotal.toLocaleString()}
        </p>
        <p className="order-details-totals-line order-details-delivery-note">
          {t.deliveryFee}: {t.deliveryCalculated}
        </p>
        <p className="order-details-totals-grand">
          <strong>
            {t.total}: {t.grandTotalWithDelivery.replace(
              '{amount}',
              `฿${order.pricing.itemsTotal.toLocaleString()}`
            )}
          </strong>
        </p>
      </div>

      {/* Sender */}
      {(order.customerName || order.phone || order.customerEmail) && (
        <div className="order-details-section">
          <h2 className="order-details-heading">{t.sender}</h2>
          <p className="order-details-value">{order.customerName || '—'}</p>
          {order.customerEmail && <p className="order-details-value">{order.customerEmail}</p>}
          {order.phone && <p className="order-details-value">{order.phone}</p>}
          {order.contactPreference && order.contactPreference.length > 0 && (
            <p className="order-details-value">
              {t.contactPreferenceHeading}: {order.contactPreference.map((opt) => contactPreferenceLabels[opt]).join(' / ')}
            </p>
          )}
        </div>
      )}

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
        .order-details-value {
          font-size: 0.95rem;
          color: var(--text);
          margin: 0 0 4px;
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
        .order-details-gmaps-wrap {
          margin: 12px 0 0;
        }
        .order-details-gmaps-btn {
          display: inline-block;
          padding: 10px 18px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          background: var(--accent);
          border: 1px solid var(--accent);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .order-details-gmaps-btn:hover {
          background: #b39868;
          color: #fff;
          transform: translateY(-1px);
        }
        .order-details-link-line {
          font-size: 0.9rem;
          color: var(--text);
          margin: 8px 0 0;
          word-break: break-all;
        }
        .order-details-link-label {
          font-weight: 600;
          color: var(--text-muted);
        }
        .order-details-link-url {
          color: var(--accent);
          text-decoration: underline;
        }
        .order-details-link-url:hover {
          color: #967a4d;
        }
        .order-details-items {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .order-details-item {
          padding: 12px 0;
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
        .order-details-meta {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .order-details-share-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 8px 14px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          background: var(--surface);
          border: 1px solid var(--accent);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .order-details-share-btn:hover {
          background: var(--accent-soft);
        }
        .order-details-share-icon {
          flex-shrink: 0;
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
