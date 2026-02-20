'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShareIcon, LineIcon, WhatsAppIcon, TelegramIcon } from '@/components/icons';
import {
  getWhatsAppOrderUrl,
  getLineOrderUrl,
  getTelegramOrderUrl,
} from '@/lib/messenger';
import { trackMessengerClick } from '@/lib/analytics';
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

/** Display label for wrapping option. Standard = Free, Premium = Premium. */
function getWrappingLabel(
  opt: string | null | undefined,
  t: { wrappingStandard: string; wrappingFree: string; wrappingPremium: string; wrappingNoPaper: string }
): string {
  if (!opt) return '';
  const lower = opt.toLowerCase();
  if (lower === 'standard' || lower === 'classic') return t.wrappingFree;
  if (lower === 'premium') return t.wrappingPremium;
  if (lower === 'no paper' || lower === 'none') return t.wrappingNoPaper;
  return opt;
}

type PaymentDisplayStatus = 'confirmed' | 'awaiting_manual' | 'awaiting_stripe' | 'unknown';

function getPaymentDisplayStatus(
  supabaseStatus: string | undefined,
  supabaseMethod: string | undefined,
  order: Order
): PaymentDisplayStatus {
  const status = (supabaseStatus ?? '').toUpperCase();
  const method = (supabaseMethod ?? '').toUpperCase();
  const legacyStatus = order.status;

  if (status === 'PAID') return 'confirmed';
  if (method === 'STRIPE' && status !== 'PAID') return 'awaiting_stripe';
  if (method === 'PROMPTPAY' || method === 'BANK_TRANSFER') return 'awaiting_manual';

  if (legacyStatus === 'paid') return 'confirmed';
  if (legacyStatus === 'payment_failed') return 'awaiting_stripe';
  if (order.stripeSessionId || order.paymentIntentId) return 'awaiting_stripe';
  return 'awaiting_manual';
}

export function OrderDetailsView({
  order,
  detailsUrl,
  baseUrl,
  copyOrderIdLabel,
  copyLinkLabel,
  copiedLabel,
  locale = 'en',
  supabasePaymentStatus,
  supabasePaymentMethod,
  supabasePaidAt,
}: {
  order: Order;
  detailsUrl: string;
  baseUrl: string;
  copyOrderIdLabel: string;
  copyLinkLabel: string;
  copiedLabel: string;
  locale?: Locale;
  supabasePaymentStatus?: string;
  supabasePaymentMethod?: string;
  supabasePaidAt?: string;
}) {
  const t = translations[locale].orderPage;
  const tCart = translations[locale].cart;
  const [copied, setCopied] = useState<'id' | 'link' | 'all' | null>(null);

  const paymentDisplay = getPaymentDisplayStatus(
    supabasePaymentStatus,
    supabasePaymentMethod,
    order
  );

  const contactPreferenceLabels: Record<ContactPreferenceOption, string> = {
    phone: tCart.contactPhone,
    line: tCart.contactLine,
    whatsapp: tCart.contactWhatsApp,
    telegram: tCart.contactTelegram,
  };

  const { date: deliveryDate, time: preferredTime } = parsePreferredTimeSlot(
    order.delivery.preferredTimeSlot || ''
  );

  const copy = async (text: string, kind: 'id' | 'link' | 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  /** Build full page text for copy-all (mobile-friendly). */
  const buildCopyAllText = useCallback((): string => {
    const lines: string[] = [];
    lines.push(t.orderDetails);
    lines.push('');
    lines.push(`Order ID: ${order.orderId}`);
    lines.push(`Details link: ${detailsUrl}`);
    lines.push('');
    lines.push(`${t.deliveryDate}: ${formatDisplayDate(deliveryDate) || '—'}`);
    if (preferredTime) lines.push(`${t.preferredTime}: ${preferredTime}`);
    lines.push('');
    lines.push(`${t.address}:`);
    lines.push(order.delivery.address || '—');
    if (order.delivery.deliveryGoogleMapsUrl) {
      lines.push(order.delivery.deliveryGoogleMapsUrl);
    }
    if (order.delivery.recipientName || order.delivery.recipientPhone) {
      lines.push('');
      lines.push(`${t.recipientName}: ${order.delivery.recipientName || '—'}`);
      if (order.delivery.recipientPhone) {
        lines.push(`${t.recipientPhone}: ${order.delivery.recipientPhone}`);
      }
    }
    lines.push('');
    lines.push(t.item + ':');
    order.items.forEach((item) => {
      lines.push(`• ${item.bouquetTitle} — ${item.size} — ฿${item.price.toLocaleString()}`);
      if (item.addOns?.cardType) {
        const cardLabel = item.addOns.cardType === 'premium' ? 'Premium' : 'Free';
        lines.push(`  ${t.cardType}: ${cardLabel}`);
      }
      if (item.addOns?.wrappingOption) {
        const wrapLabel = getWrappingLabel(item.addOns.wrappingOption, t);
        lines.push(`  ${t.wrapping}: ${wrapLabel}`);
      }
      if (item.addOns?.cardMessage?.trim()) {
        lines.push(`  ${t.cardMessage}: ${item.addOns.cardMessage.trim()}`);
      }
    });
    lines.push('');
    lines.push(t.totalsHeading + ':');
    lines.push(`${t.bouquetPrice}: ฿${order.pricing.itemsTotal.toLocaleString()}`);
    lines.push(`${t.deliveryFee}: ฿${order.pricing.deliveryFee.toLocaleString()}`);
    if (order.referralDiscount != null && order.referralDiscount > 0) {
      lines.push(`${t.discount ?? 'Discount'}: -฿${order.referralDiscount.toLocaleString()}`);
    }
    lines.push(`${t.total}: ฿${order.pricing.grandTotal.toLocaleString()}`);
    if (order.customerName || order.phone || order.customerEmail) {
      lines.push('');
      lines.push(t.sender + ':');
      if (order.customerName) lines.push(order.customerName);
      if (order.customerEmail) lines.push(order.customerEmail);
      if (order.phone) lines.push(order.phone);
    }
    lines.push('');
    lines.push(`Created: ${new Date(order.createdAt).toLocaleString()}`);
    return lines.join('\n');
  }, [order, detailsUrl, deliveryDate, preferredTime, t]);

  const orderMessage = `Order ${order.orderId}\n${detailsUrl}`;
  const contactChannels = [
    { id: 'line' as const, getUrl: () => getLineOrderUrl(orderMessage), Icon: LineIcon, color: '#00B900', label: 'LINE' },
    { id: 'whatsapp' as const, getUrl: () => getWhatsAppOrderUrl(orderMessage), Icon: WhatsAppIcon, color: '#25D366', label: 'WhatsApp' },
    { id: 'telegram' as const, getUrl: () => getTelegramOrderUrl(orderMessage), Icon: TelegramIcon, color: '#26A5E4', label: 'Telegram' },
  ];

  const paymentBadgeLabel =
    paymentDisplay === 'confirmed'
      ? t.paymentConfirmed
      : paymentDisplay === 'awaiting_manual'
        ? (supabasePaymentMethod ?? '').toUpperCase() === 'PROMPTPAY'
          ? t.awaitingPaymentPromptPay
          : t.awaitingPaymentBankTransfer
        : paymentDisplay === 'awaiting_stripe'
          ? t.paymentNotCompleted
          : t.awaitingPayment;

  return (
    <div className="order-details-view">
      {/* Payment status badge */}
      <div className="order-details-section order-details-payment-badge">
        <span
          className={
            paymentDisplay === 'confirmed'
              ? 'order-details-badge order-details-badge-confirmed'
              : 'order-details-badge order-details-badge-pending'
          }
        >
          {paymentBadgeLabel}
        </span>
        {paymentDisplay === 'confirmed' && supabasePaidAt && (
          <span className="order-details-paid-at">
            {new Date(supabasePaidAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Contact Lanna Bloom - LINE, WhatsApp, Telegram */}
      <div className="order-details-section order-details-contact-block">
        <h2 className="order-details-contact-heading">{t.contactLannaBloom}</h2>
        <div className="order-details-contact-icons">
          {contactChannels.map((ch) => {
            const href = ch.getUrl();
            return (
              <a
                key={ch.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="order-details-contact-link"
                aria-label={`Contact on ${ch.label}`}
                title={ch.label}
                style={{ color: ch.color }}
                onClick={() =>
                  trackMessengerClick({
                    channel: ch.id,
                    page_location: 'order_page',
                    link_url: href,
                  })
                }
              >
                <ch.Icon size={24} className="order-details-contact-icon" />
              </a>
            );
          })}
        </div>
      </div>

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
        {preferredTime && (
          <>
            <h2 className="order-details-heading">{t.preferredTime}</h2>
            <p className="order-details-value">{preferredTime}</p>
          </>
        )}
        {(deliveryDate || preferredTime) && (
          <p className="order-details-delivery-note">{t.deliveryWindowNote}</p>
        )}
      </div>

      {/* No need to contact us — only when paid */}
      {paymentDisplay === 'confirmed' && (
        <div className="order-details-section order-details-reassurance">
          <p className="order-details-reassurance-text">{t.noNeedToContactUs}</p>
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
                  <p className="order-details-item-main">
                    <strong>{item.bouquetTitle}</strong> — {item.size} — ฿{item.price.toLocaleString()}
                  </p>
                  <div className="order-details-item-addons">
                    {item.addOns?.cardType != null && (
                      <p className="order-details-addon-row">
                        <span className="order-details-addon-label">{t.cardType}:</span>
                        <span className="order-details-addon-value order-details-addon-highlight">
                          {item.addOns.cardType === 'premium' ? 'Premium' : 'Free'}
                        </span>
                      </p>
                    )}
                    {item.addOns?.wrappingOption && (
                      <p className="order-details-addon-row">
                        <span className="order-details-addon-label">{t.wrapping}:</span>
                        <span className="order-details-addon-value order-details-addon-highlight">
                          {getWrappingLabel(item.addOns.wrappingOption, t)}
                        </span>
                      </p>
                    )}
                    {item.addOns?.cardMessage?.trim() && (
                      <p className="order-details-addon-row">
                        <span className="order-details-addon-label">{t.cardMessage}:</span>
                        <span className="order-details-addon-value">"{item.addOns.cardMessage.trim()}"</span>
                      </p>
                    )}
                  </div>
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
        <p className="order-details-totals-line">
          {t.deliveryFee}: ฿{order.pricing.deliveryFee.toLocaleString()}
        </p>
        {order.referralDiscount != null && order.referralDiscount > 0 && (
          <p className="order-details-totals-line order-details-discount">
            {t.discount ?? 'Discount'}: -฿{order.referralDiscount.toLocaleString()}
          </p>
        )}
        <p className="order-details-totals-grand">
          <strong>
            {t.total}: ฿{order.pricing.grandTotal.toLocaleString()}
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
      <button
        type="button"
        className="order-details-copy-all-btn"
        onClick={() => copy(buildCopyAllText(), 'all')}
        aria-label={t.copyAll}
      >
        {copied === 'all' ? copiedLabel : t.copyAll}
      </button>
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
        .order-details-discount {
          color: var(--accent);
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
        .order-details-payment-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .order-details-badge {
          display: inline-block;
          padding: 8px 14px;
          font-size: 0.9rem;
          font-weight: 700;
          border-radius: var(--radius-sm);
        }
        .order-details-badge-confirmed {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .order-details-badge-pending {
          background: #fff3e0;
          color: #e65100;
        }
        .order-details-paid-at {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .order-details-delivery-note {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .order-details-reassurance {
          background: var(--pastel-cream, #f9f5f0);
          padding: 12px 16px;
          border-radius: var(--radius-sm);
        }
        .order-details-reassurance-text {
          font-size: 0.95rem;
          color: var(--text);
          margin: 0;
        }
        .order-details-contact-block {
          padding: 16px;
          background: var(--pastel-cream, #f9f5f0);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .order-details-contact-heading {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-muted);
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .order-details-contact-icons {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .order-details-contact-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .order-details-contact-link:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }
        .order-details-contact-icon {
          flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .order-details-contact-link {
            width: 36px;
            height: 36px;
          }
          .order-details-contact-icon {
            width: 20px;
            height: 20px;
          }
        }
        .order-details-item-main {
          margin: 0 0 8px;
          font-size: 1rem;
        }
        .order-details-item-addons {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .order-details-addon-row {
          margin: 0;
          font-size: 0.95rem;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: baseline;
        }
        .order-details-addon-label {
          font-weight: 600;
          color: var(--text-muted);
          min-width: 90px;
        }
        .order-details-addon-value {
          color: var(--text);
        }
        .order-details-addon-highlight {
          font-weight: 700;
          color: var(--accent);
        }
        .order-details-copy-all-btn {
          display: block;
          margin-top: 12px;
          padding: 8px 14px;
          font-size: 0.9rem;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .order-details-copy-all-btn:hover {
          color: var(--text);
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}
