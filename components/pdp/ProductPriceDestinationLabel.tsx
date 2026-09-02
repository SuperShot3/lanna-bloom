'use client';

import { translations, type Locale } from '@/lib/i18n';
import { requestOpenDeliveryRegionPicker } from '@/lib/delivery/deliveryRegionCookie';

export function ProductPriceDestinationLabel({
  lang,
  destinationLabel,
}: {
  lang: Locale;
  destinationLabel: string;
}) {
  const t = translations[lang].product;
  const priceLabel = (
    t.priceForDeliveryTo ?? 'Price for delivery to {destination}'
  ).replace('{destination}', destinationLabel);
  const changeLabel = t.changeRegion ?? 'Change region';

  return (
    <p className="pdp-price-destination" role="status">
      <span>{priceLabel}</span>{' '}
      <button
        type="button"
        className="pdp-price-destination-change"
        onClick={() => requestOpenDeliveryRegionPicker()}
      >
        {changeLabel}
      </button>
      <style jsx>{`
        .pdp-price-destination {
          margin: 4px 0 0;
          font-size: 0.8125rem;
          line-height: 1.4;
          color: var(--text-muted, #6b7280);
        }
        .pdp-price-destination-change {
          margin: 0;
          padding: 0;
          border: 0;
          background: none;
          color: var(--primary, #1a3c34);
          font: inherit;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }
        .pdp-price-destination-change:hover {
          color: #c5a059;
        }
        .pdp-price-destination-change:focus-visible {
          outline: 2px solid var(--accent, #c5a059);
          outline-offset: 2px;
        }
      `}</style>
    </p>
  );
}
