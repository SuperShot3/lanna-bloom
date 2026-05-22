'use client';

import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

export function ProductPurchaseActions({
  lang,
  totalPrice,
  onAddToCart,
  onBuyNow,
  disabled,
  justAdded = false,
}: {
  lang: Locale;
  totalPrice: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  disabled?: boolean;
  justAdded?: boolean;
}) {
  const tProduct = translations[lang].product;
  const tCart = translations[lang].cart;
  const resolvedAtc = (tProduct.addToCartWithPrice ?? `${tCart.addToCart} — ฿{price}`).replace(
    '{price}',
    totalPrice.toLocaleString()
  );

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
            <span className="material-symbols-outlined" aria-hidden>
              shopping_bag
            </span>
            {resolvedAtc}
          </button>
          <button
            type="button"
            className={styles.purchaseBuyNow}
            onClick={onBuyNow}
            disabled={disabled}
          >
            <span className="material-symbols-outlined material-symbols-filled" aria-hidden>
              bolt
            </span>
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
            <span className="material-symbols-outlined" aria-hidden>
              check_circle
            </span>
            {tCart.addedToCart}
          </p>
          <div className={styles.purchaseAddedLinks}>
            <Link href={`/${lang}/catalog`} className={styles.purchaseAddedLinkSecondary}>
              {tCart.continueShopping}
            </Link>
            <Link href={`/${lang}/cart`} className={styles.purchaseAddedLinkPrimary}>
              <span className="material-symbols-outlined" aria-hidden>
                shopping_bag
              </span>
              {tCart.goToCart}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
