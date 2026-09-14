'use client';

import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { useNarrowViewport } from '@/hooks/useNarrowViewport';
import { BoltIcon, CartIcon, StorefrontIcon } from '@/components/icons';
import styles from './product-pdp.module.css';

export function ProductPurchaseActions({
  lang,
  onContinue,
  onBuyNow,
  disabled,
  justAdded = false,
  catalogHref,
}: {
  lang: Locale;
  onContinue: () => void;
  onBuyNow: () => void;
  disabled?: boolean;
  justAdded?: boolean;
  /** Market-aware catalog link for continue shopping. */
  catalogHref?: string;
}) {
  const tProduct = translations[lang].product;
  const tCart = translations[lang].cart;
  const narrow = useNarrowViewport();
  const resolvedContinueLabel = narrow
    ? tProduct.continueToGiftDetailsMobile
    : tProduct.continueToGiftDetails;
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
            onClick={onContinue}
            disabled={disabled}
          >
            <CartIcon size={20} />
            {resolvedContinueLabel}
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
