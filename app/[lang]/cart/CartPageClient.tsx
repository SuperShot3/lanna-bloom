'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { DeliveryForm, type DeliveryFormValues } from '@/components/DeliveryForm';
import { MessengerOrderButtons } from '@/components/MessengerOrderButtons';
import { buildCartOrderMessage, type CartOrderItem } from '@/lib/messenger';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function buildAddOnsSummaryForDisplay(
  addOns: CartOrderItem['addOns'],
  t: Record<string, string | number>
): string {
  const lines: string[] = [];
  if (addOns.cardType === 'beautiful') {
    lines.push(String(t.addOnsSummaryCardBeautiful));
  } else if (addOns.cardType === 'free') {
    lines.push(String(t.addOnsSummaryCard).replace('{label}', String(t.cardFree)));
  }
  if (addOns.wrappingPreference === 'classic') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingClassic)));
  } else if (addOns.wrappingPreference === 'premium') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingPremium)));
  } else if (addOns.wrappingPreference === 'none') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingNone)));
  }
  if (addOns.cardMessage.trim()) {
    lines.push(String(t.addOnsSummaryMessage).replace('{text}', addOns.cardMessage.trim()));
  }
  return lines.join('. ');
}

export function CartPageClient({ lang }: { lang: Locale }) {
  const { items, removeItem } = useCart();
  const [delivery, setDelivery] = useState<DeliveryFormValues>({
    district: null,
    date: '',
    deliveryType: 'standard',
  });
  const t = translations[lang].cart;
  const tBuyNow = translations[lang].buyNow;

  const deliveryAddress =
    delivery.district && lang === 'th'
      ? `เชียงใหม่ ${delivery.district.nameTh}`
      : delivery.district
        ? `Chiang Mai, ${delivery.district.nameEn}`
        : '';
  const deliveryDate = delivery.date || '';

  const cartOrderItems: CartOrderItem[] = items.map((item) => ({
    nameEn: item.nameEn,
    nameTh: item.nameTh,
    size: { label: item.size.label, price: item.size.price },
    addOns: item.addOns,
  }));
  const message = buildCartOrderMessage(cartOrderItems, deliveryAddress, deliveryDate, lang);

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1 className="cart-page-title">{t.yourCart}</h1>
          <div className="cart-empty">
            <p className="cart-empty-text">{t.cartEmpty}</p>
            <Link href={`/${lang}/catalog`} className="cart-empty-link">
              {t.cartEmptyLink}
            </Link>
          </div>
        </div>
        <style jsx>{`
          .cart-page {
            padding: 24px 0 48px;
          }
          .cart-page-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text);
            margin: 0 0 20px;
          }
          .cart-empty {
            padding: 32px 24px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            text-align: center;
          }
          .cart-empty-text {
            margin: 0 0 16px;
            font-size: 1rem;
            color: var(--text-muted);
          }
          .cart-empty-link {
            font-size: 1rem;
            font-weight: 600;
            color: var(--accent);
            text-decoration: underline;
          }
          .cart-empty-link:hover {
            color: #967a4d;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-page-title">{t.yourCart}</h1>
        <div className="cart-list">
          {items.map((item, index) => {
            const name = lang === 'th' ? item.nameTh : item.nameEn;
            const addOnsSummary = buildAddOnsSummaryForDisplay(
              item.addOns,
              tBuyNow as Record<string, string | number>
            );
            return (
              <div key={`${item.bouquetId}-${index}`} className="cart-item">
                <div className="cart-item-main">
                  <h3 className="cart-item-name">{name}</h3>
                  <p className="cart-item-size">
                    {item.size.label} — ฿{item.size.price.toLocaleString()}
                  </p>
                  {addOnsSummary && (
                    <p className="cart-item-addons">{addOnsSummary}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="cart-item-remove"
                  onClick={() => removeItem(index)}
                  aria-label={t.remove}
                >
                  {t.remove}
                </button>
              </div>
            );
          })}
        </div>
        <section className="cart-delivery" aria-labelledby="cart-delivery-heading">
          <h2 id="cart-delivery-heading" className="cart-section-title">
            {t.deliveryAndContact}
          </h2>
          <DeliveryForm
            lang={lang}
            value={delivery}
            onChange={setDelivery}
            step3Heading={t.sendOrderVia}
            step3Content={
              <MessengerOrderButtons lang={lang} prebuiltMessage={message} />
            }
          />
        </section>
      </div>
      <style jsx>{`
        .cart-page {
          padding: 24px 0 48px;
        }
        .cart-page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 20px;
        }
        .cart-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }
        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .cart-item-main {
          flex: 1;
          min-width: 0;
        }
        .cart-item-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
        }
        .cart-item-size {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          margin: 0 0 4px;
        }
        .cart-item-addons {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }
        .cart-item-remove {
          flex-shrink: 0;
          padding: 6px 12px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .cart-item-remove:hover {
          border-color: var(--accent);
          color: var(--text);
        }
        .cart-delivery {
          margin-bottom: 32px;
        }
        .cart-section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 16px;
        }
      `}</style>
    </div>
  );
}
