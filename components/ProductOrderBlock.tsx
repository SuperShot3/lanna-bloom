'use client';

import { useState } from 'react';
import { Bouquet, BouquetSize } from '@/lib/bouquets';
import { SizeSelector } from './SizeSelector';
import { MessengerOrderButtons } from './MessengerOrderButtons';
import { DeliveryForm, type DeliveryFormValues } from './DeliveryForm';
import {
  AddOnsSection,
  getDefaultAddOns,
  type AddOnsValues,
} from './AddOnsSection';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function buildAddOnsSummary(addOns: AddOnsValues, lang: Locale): string {
  const t = translations[lang].buyNow;
  const lines: string[] = [];
  if (addOns.cardType === 'beautiful') {
    lines.push(t.addOnsSummaryCardBeautiful);
  } else if (addOns.cardType === 'free') {
    lines.push(t.addOnsSummaryCard.replace('{label}', t.cardFree));
  }
  if (addOns.wrappingPreference === 'classic') {
    lines.push(t.addOnsSummaryWrapping.replace('{label}', t.wrappingClassic));
  } else if (addOns.wrappingPreference === 'premium') {
    lines.push(t.addOnsSummaryWrapping.replace('{label}', t.wrappingPremium));
  } else if (addOns.wrappingPreference === 'none') {
    lines.push(t.addOnsSummaryWrapping.replace('{label}', t.wrappingNone));
  }
  if (addOns.cardMessage.trim()) {
    lines.push(t.addOnsSummaryMessage.replace('{text}', addOns.cardMessage.trim()));
  }
  return lines.join('. ');
}

export function ProductOrderBlock({ bouquet, lang }: { bouquet: Bouquet; lang: Locale }) {
  const [selectedSize, setSelectedSize] = useState<BouquetSize>(bouquet.sizes[0]);
  const [delivery, setDelivery] = useState<DeliveryFormValues>({
    district: null,
    date: '',
    deliveryType: 'standard',
  });
  const [addOns, setAddOns] = useState<AddOnsValues>(getDefaultAddOns);
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;

  const deliveryAddress =
    delivery.district && lang === 'th'
      ? `เชียงใหม่ ${delivery.district.nameTh}`
      : delivery.district
        ? `Chiang Mai, ${delivery.district.nameEn}`
        : '';
  const deliveryDate = delivery.date || '';
  const addOnsSummary = buildAddOnsSummary(addOns, lang);
  const hasAddOns = !!(
    addOns.cardType ||
    addOns.wrappingPreference ||
    addOns.cardMessage.trim()
  );
  const t = translations[lang].buyNow;

  return (
    <div className="order-block">
      <DeliveryForm lang={lang} value={delivery} onChange={setDelivery} />
      <SizeSelector
        sizes={bouquet.sizes}
        selected={selectedSize}
        onSelect={setSelectedSize}
        lang={lang}
      />
      <AddOnsSection lang={lang} value={addOns} onChange={setAddOns} />
      {hasAddOns && addOnsSummary && (
        <div className="order-addons-summary" role="status">
          <span className="order-addons-summary-label">{t.addOnsSummaryLabel}</span>
          <span className="order-addons-summary-text">{addOnsSummary}</span>
        </div>
      )}
      <MessengerOrderButtons
        bouquetName={name}
        sizeLabel={selectedSize.label}
        lang={lang}
        deliveryAddress={deliveryAddress}
        deliveryDate={deliveryDate}
        addOnsSummary={addOnsSummary}
      />
      <style jsx>{`
        .order-addons-summary {
          margin-top: 12px;
          padding: 10px 14px;
          background: var(--pastel-cream, #fdf8f3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: var(--text);
        }
        .order-addons-summary-label {
          font-weight: 600;
          color: var(--text-muted);
        }
        .order-addons-summary-text {
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
