'use client';

import {
  applyCatalogDiscountThb,
  hasCatalogDiscount,
} from '@/lib/catalogDiscount';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';
import type { Locale } from '@/lib/i18n';
import { CurrencyAmount } from '@/components/CurrencyDisplay';

export function CatalogDiscountPrice({
  basePriceThb,
  discountPercent,
  destinationId,
  lang,
  fromLabel,
  extraThb = 0,
  className = '',
  amountClassName = '',
}: {
  basePriceThb: number;
  discountPercent?: number;
  destinationId: DeliveryDestinationId;
  lang: Locale;
  fromLabel?: string;
  /** Added after discount and before expansion (e.g. PDP add-ons). */
  extraThb?: number;
  className?: string;
  amountClassName?: string;
}) {
  const extra = Math.max(0, extraThb);
  const discountedBase = applyCatalogDiscountThb(basePriceThb, discountPercent);
  const displayCurrent = applyExpansionItemMarkupThb(discountedBase + extra, destinationId);
  const onSale = hasCatalogDiscount(discountPercent) && discountedBase < basePriceThb;

  if (!onSale) {
    return (
      <span className={className}>
        {fromLabel ? <span className="catalog-price-from">{fromLabel} </span> : null}
        <CurrencyAmount thb={displayCurrent} lang={lang} className={amountClassName} />
      </span>
    );
  }

  const displayWas = applyExpansionItemMarkupThb(basePriceThb + extra, destinationId);

  return (
    <span className={`catalog-price-sale ${className}`.trim()}>
      {fromLabel ? <span className="catalog-price-from">{fromLabel} </span> : null}
      <span className="catalog-price-was" aria-hidden>
        <CurrencyAmount thb={displayWas} lang={lang} showEstimateLabel={false} />
      </span>{' '}
      <CurrencyAmount
        thb={displayCurrent}
        lang={lang}
        className={`catalog-price-now ${amountClassName}`.trim()}
      />
      <style jsx>{`
        .catalog-price-sale {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 4px 6px;
        }
        .catalog-price-was {
          font-size: 0.82em;
          font-weight: 500;
          color: var(--text-muted, #6b6560);
          text-decoration: line-through;
          opacity: 0.85;
        }
        .catalog-price-now {
          font-weight: 700;
          color: #9f1239;
        }
      `}</style>
    </span>
  );
}
