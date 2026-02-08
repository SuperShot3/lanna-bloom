'use client';

import { useState, useEffect } from 'react';
import {
  getWhatsAppOrderUrl,
  getWhatsAppContactUrl,
  getLineOrderUrl,
  getLineShareUrl,
  getLineContactUrl,
  getTelegramOrderUrl,
  getTelegramContactUrl,
  buildOrderMessage,
} from '@/lib/messenger';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { MessengerPageLocation } from '@/lib/analytics';
import { trackMessengerClick } from '@/lib/analytics';
import { LineIcon, WhatsAppIcon, TelegramIcon } from './icons';

const CHANNELS_ORDER = [
  { id: 'line' as const, getUrl: getLineOrderUrl, contactUrl: getLineContactUrl, labelKey: 'orderLine' as const, Icon: LineIcon, color: '#00B900' },
  { id: 'whatsapp' as const, getUrl: getWhatsAppOrderUrl, contactUrl: getWhatsAppContactUrl, labelKey: 'orderWhatsApp' as const, Icon: WhatsAppIcon, color: '#25D366' },
  { id: 'telegram' as const, getUrl: getTelegramOrderUrl, contactUrl: getTelegramContactUrl, labelKey: 'orderTelegram' as const, Icon: TelegramIcon, color: '#26A5E4' },
] as const;

export function MessengerOrderButtons({
  bouquetName,
  sizeLabel,
  lang,
  deliveryAddress = '',
  deliveryDate = '',
  addOnsSummary = '',
  prebuiltMessage,
  lineUseContactUrl,
  contactOnly,
  pageLocation = 'product',
}: {
  bouquetName?: string;
  sizeLabel?: string;
  lang: Locale;
  deliveryAddress?: string;
  deliveryDate?: string;
  addOnsSummary?: string;
  /** When provided, use this message instead of building from bouquet/delivery/addOns (e.g. for cart page). */
  prebuiltMessage?: string;
  /** When true, LINE button uses add-friend/contact link (no prefilled message). Use on checkout success so user can add and chat. */
  lineUseContactUrl?: boolean;
  /** When true, all buttons use contact links only (no prefilled message). Use on guide/SEO pages. */
  contactOnly?: boolean;
  /** Where these buttons are shown (for analytics: header, checkout_success, product, cart, guide). */
  pageLocation?: MessengerPageLocation;
}) {
  const t = translations[lang].product;
  const message =
    prebuiltMessage != null && prebuiltMessage !== ''
      ? prebuiltMessage
      : buildOrderMessage(
          bouquetName ?? '',
          sizeLabel ?? '',
          t.messageTemplate,
          deliveryAddress || deliveryDate || addOnsSummary
            ? {
                address: deliveryAddress,
                date: deliveryDate,
                templateWithDelivery:
                  (deliveryAddress || deliveryDate) ? t.messageTemplateWithDelivery : undefined,
                addOnsSummary,
              }
            : undefined
        );

  // Use LINE share URL on desktop (oaMessage often unreliable); OA chat on mobile. Set after mount to avoid hydration mismatch.
  const [useLineShareFallback, setUseLineShareFallback] = useState(false);
  useEffect(() => {
    const isDesktop = typeof navigator !== 'undefined' && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setUseLineShareFallback(isDesktop);
  }, []);

  const getLineHref = (msg: string) =>
    lineUseContactUrl || contactOnly ? getLineContactUrl() : (useLineShareFallback ? getLineShareUrl(msg) : getLineOrderUrl(msg));

  return (
    <div className="order-buttons">
      <p className="order-via">{t.orderVia}</p>
      <div className="order-grid">
        {CHANNELS_ORDER.map(({ id, getUrl, contactUrl, labelKey, Icon, color }) => {
          const href = contactOnly
            ? (id === 'line' ? getLineContactUrl() : contactUrl())
            : (id === 'line' ? getLineHref(message) : getUrl(message));
          return (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="order-btn"
              title={t[labelKey]}
              onClick={() =>
                trackMessengerClick({
                  channel: id,
                  page_location: pageLocation,
                  link_url: href,
                })
              }
            >
              <span className="order-btn-icon" style={{ color }}>
                <Icon size={22} />
              </span>
              <span className="order-btn-label">{t[labelKey]}</span>
            </a>
          );
        })}
      </div>
      <style jsx>{`
        .order-buttons {
          margin-top: 24px;
        }
        .order-via {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
          margin: 0 0 12px;
        }
        .order-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .order-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 14px;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
          text-align: center;
          transition: border-color 0.2s, background 0.2s;
        }
        .order-btn:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .order-btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .order-btn-label {
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .order-grid {
            grid-template-columns: 1fr;
          }
          .order-btn-label {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
