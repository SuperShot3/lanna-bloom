'use client';

import {
  getWhatsAppOrderUrl,
  getLineOrderUrl,
  getTelegramOrderUrl,
  buildOrderMessage,
} from '@/lib/messenger';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { LineIcon, WhatsAppIcon, TelegramIcon } from './icons';

const CHANNELS = [
  { id: 'line', getUrl: getLineOrderUrl, labelKey: 'orderLine' as const, Icon: LineIcon, color: '#00B900' },
  { id: 'whatsapp', getUrl: getWhatsAppOrderUrl, labelKey: 'orderWhatsApp' as const, Icon: WhatsAppIcon, color: '#25D366' },
  { id: 'telegram', getUrl: getTelegramOrderUrl, labelKey: 'orderTelegram' as const, Icon: TelegramIcon, color: '#26A5E4' },
] as const;

export function MessengerOrderButtons({
  bouquetName,
  sizeLabel,
  lang,
  deliveryAddress = '',
  deliveryDate = '',
  addOnsSummary = '',
}: {
  bouquetName: string;
  sizeLabel: string;
  lang: Locale;
  deliveryAddress?: string;
  deliveryDate?: string;
  addOnsSummary?: string;
}) {
  const t = translations[lang].product;
  const useDeliveryTemplate = !!(deliveryAddress || deliveryDate);
  const message = buildOrderMessage(
    bouquetName,
    sizeLabel,
    t.messageTemplate,
    useDeliveryTemplate || addOnsSummary
      ? {
          address: deliveryAddress,
          date: deliveryDate,
          templateWithDelivery: useDeliveryTemplate ? t.messageTemplateWithDelivery : undefined,
          addOnsSummary,
        }
      : undefined
  );

  return (
    <div className="order-buttons">
      <p className="order-via">{t.orderVia}</p>
      <div className="order-grid">
        {CHANNELS.map(({ id, getUrl, labelKey, Icon, color }) => (
          <a
            key={id}
            href={getUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="order-btn"
            title={t[labelKey]}
          >
            <span className="order-btn-icon" style={{ color }}>
              <Icon size={22} />
            </span>
            <span className="order-btn-label">{t[labelKey]}</span>
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
