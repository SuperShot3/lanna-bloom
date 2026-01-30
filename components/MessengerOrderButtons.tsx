'use client';

import {
  getWhatsAppOrderUrl,
  getLineOrderUrl,
  getTelegramOrderUrl,
  getFacebookOrderUrl,
  buildOrderMessage,
} from '@/lib/messenger';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const CHANNELS = [
  { id: 'line', getUrl: getLineOrderUrl, labelKey: 'orderLine' as const },
  { id: 'whatsapp', getUrl: getWhatsAppOrderUrl, labelKey: 'orderWhatsApp' as const },
  { id: 'telegram', getUrl: getTelegramOrderUrl, labelKey: 'orderTelegram' as const },
  { id: 'facebook', getUrl: getFacebookOrderUrl, labelKey: 'orderFacebook' as const },
] as const;

export function MessengerOrderButtons({
  bouquetName,
  sizeLabel,
  lang,
}: {
  bouquetName: string;
  sizeLabel: string;
  lang: Locale;
}) {
  const t = translations[lang].product;
  const message = buildOrderMessage(bouquetName, sizeLabel, t.messageTemplate);

  return (
    <div className="order-buttons">
      <p className="order-via">{t.orderVia}</p>
      <div className="order-grid">
        {CHANNELS.map(({ id, getUrl, labelKey }) => (
          <a
            key={id}
            href={getUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="order-btn"
          >
            {t[labelKey]}
          </a>
        ))}
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
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .order-btn {
          display: block;
          padding: 14px 16px;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
          text-align: center;
          transition: border-color 0.2s, background 0.2s;
        }
        .order-btn:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        @media (min-width: 480px) {
          .order-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
