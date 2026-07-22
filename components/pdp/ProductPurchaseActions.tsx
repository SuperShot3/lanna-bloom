'use client';

import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { useNarrowViewport } from '@/hooks/useNarrowViewport';
import { BoltIcon, CartIcon, StorefrontIcon } from '@/components/icons';
import styles from './product-pdp.module.css';

function formatAtcLabel(
  lang: Locale,
  totalPrice: number,
  narrow: boolean
): string {
  const tProduct = translations[lang].product as Record<string, string | undefined>;
  const tCart = translations[lang].cart;
  const template =
    narrow && tProduct.addToCartWithPriceMobile
      ? tProduct.addToCartWithPriceMobile
      : tProduct.addToCartWithPrice ?? `${tCart.addToCart} — ฿{price}`;
  return template.replace('{price}', totalPrice.toLocaleString());
}

export function ProductPurchaseActions({
  lang,
  totalPrice,
  onAddToCart,
  onBuyNow,
  disabled,
  justAdded = false,
  catalogHref,
}: {
  lang: Locale;
  totalPrice: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  disabled?: boolean;
  justAdded?: boolean;
  /** Market-aware catalog link for continue shopping. */
  catalogHref?: string;
}) {
  const tProduct = translations[lang].product;
  const tCart = translations[lang].cart;
  const narrow = useNarrowViewport();
  const resolvedAtc = formatAtcLabel(lang, totalPrice, narrow);
  const continueHref = catalogHref ?? `/${lang}/catalog`;

  return (
    <div className={styles.purchaseActionsStage} data-added={justAdded ? '' : undefined}>
      <div
        className={`${styles.purchaseActionsLayer} ${
          justAdded ? styles.purchaseActionsLayerHidden : styles.purchaseActionsLayerVisible
        }`}
        aria-hidden={justAdded}
      >
        <div className={styles.purchaseActions}>
          <button
            id="pdp-primary-atc"
            type="button"
            className={styles.purchaseAtc}
            onClick={onAddToCart}
            disabled={disabled}
          >
            <CartIcon size={20} />
            {resolvedAtc}
          </button>
          <button
            type="button"
            className={styles.purchaseBuyNow}
            onClick={onBuyNow}
            disabled={disabled}
          >
            <BoltIcon size={20} />
            {tProduct.buyNowPdp ?? 'Buy now'}
          </button>
        </div>
      </div>

      <div
        className={`${styles.purchaseActionsLayer} ${
          justAdded ? styles.purchaseActionsLayerVisible : styles.purchaseActionsLayerHidden
        }`}
        aria-hidden={!justAdded}
      >
        <div className={styles.purchaseAdded} role="status" aria-live="polite">
          <p className={styles.purchaseAddedText}>
            <StorefrontIcon name="check-circle" size={20} />
            {tCart.addedToCart}
          </p>
          <div className={styles.purchaseAddedLinks}>
            <Link href={continueHref} className={styles.purchaseAddedLinkSecondary}>
              {tCart.continueShopping}
            </Link>
            <Link href={`/${lang}/cart`} className={styles.purchaseAddedLinkPrimary}>
              <CartIcon size={18} />
              {tCart.goToCart}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
