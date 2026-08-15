import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import {
  fillDeliveryFeeAmountPlaceholder,
  formatMinCheckoutFeeLabel,
} from '@/lib/delivery/coverageDisplay';
import { translations, type Locale } from '@/lib/i18n';
import styles from './DeliveryFromFeeHint.module.css';

export function DeliveryFromFeeHint({
  lang,
  destinationId,
  variant,
}: {
  lang: Locale;
  destinationId: DeliveryDestinationId;
  variant: 'card' | 'pdp';
}) {
  if (!formatMinCheckoutFeeLabel(destinationId, lang)) return null;

  const tCatalog = translations[lang].catalog as { deliveryFromFee?: string };
  const tProduct = translations[lang].product as { deliveryFromFeeDetail?: string };
  const template =
    variant === 'pdp'
      ? tProduct.deliveryFromFeeDetail ?? tCatalog.deliveryFromFee ?? 'Delivery from {amount}'
      : tCatalog.deliveryFromFee ?? 'Delivery from {amount}';
  const text = fillDeliveryFeeAmountPlaceholder(template, destinationId, lang);

  return <p className={variant === 'pdp' ? styles.pdp : styles.card}>{text}</p>;
}
