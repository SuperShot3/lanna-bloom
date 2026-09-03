'use client';

import { translations, type Locale } from '@/lib/i18n';
import {
  fillDeliveryFeeAmountPlaceholder,
  formatMinCheckoutFeeLabel,
} from '@/lib/delivery/coverageDisplay';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import styles from './product-pdp.module.css';

export function ProductDeliveryLine({
  lang,
  destinationLabel,
  destinationId,
  hideFromAmount,
}: {
  lang: Locale;
  destinationLabel: string;
  destinationId: DeliveryDestinationId;
  hideFromAmount?: boolean;
}) {
  const t = translations[lang].product;
  const hasAmount = Boolean(formatMinCheckoutFeeLabel(destinationId, lang)) && !hideFromAmount;
  const template = hasAmount
    ? t.deliveryToFromFee ?? 'Delivery to {destination} from {amount} · exact fee at checkout'
    : t.deliveryToExactFee ?? 'Delivery to {destination} · exact fee at checkout';
  const withDest = template.replace('{destination}', destinationLabel);
  const text = hasAmount
    ? fillDeliveryFeeAmountPlaceholder(withDest, destinationId, lang)
    : withDest.replaceAll('{amount}', '').replace(/\s{2,}/g, ' ').trim();

  return <p className={styles.deliveryLine}>{text}</p>;
}
