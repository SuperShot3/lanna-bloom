'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import styles from './product-pdp.module.css';

const PDP_ATC_SENTINEL_ID = 'pdp-primary-atc';

export function ProductStickyPurchaseBar({
  lang,
  productTitle,
  thumbUrl,
  totalPrice,
  onAddToCart,
  disabled,
  justAdded = false,
  onVisibilityChange,
}: {
  lang: Locale;
  productTitle: string;
  thumbUrl?: string | null;
  totalPrice: number;
  onAddToCart: () => void;
  disabled?: boolean;
  justAdded?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);
  const tProduct = translations[lang].product;
  const tCart = translations[lang].cart;
  const stickyAtcLabel = (tProduct.addToCartWithPrice ?? `${tCart.addToCart} — ฿{price}`).replace(
    '{price}',
    totalPrice.toLocaleString()
  );

  useEffect(() => {
    const sentinel = document.getElementById(PDP_ATC_SENTINEL_ID);
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = !entry.isIntersecting;
        setVisible(next);
        onVisibilityChange?.(next);
      },
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  return (
    <div
      className={`${styles.stickyBar} ${visible ? styles.stickyBarVisible : ''}`}
      aria-hidden={!visible}
      data-added={justAdded ? '' : undefined}
    >
      <div className={styles.stickyBarInner}>
        {thumbUrl ? (
          <div className={styles.stickyThumb}>
            <Image
              src={thumbUrl}
              alt=""
              width={48}
              height={48}
              className={styles.stickyThumbImg}
              unoptimized={thumbUrl.startsWith('data:')}
            />
          </div>
        ) : null}
        <div className={styles.stickyInfo}>
          <p className={styles.stickyTitle}>{productTitle}</p>
          <p className={styles.stickyPrice}>
            <data className={styles.stickyPriceValue} value={totalPrice}>
              ฿{totalPrice.toLocaleString()}
            </data>
          </p>
        </div>
        <div className={styles.stickyActionsStage}>
          <div
            className={`${styles.stickyActionsLayer} ${
              justAdded ? styles.stickyActionsLayerHidden : styles.stickyActionsLayerVisible
            }`}
            aria-hidden={justAdded}
          >
            <button
              type="button"
              className={styles.stickyAtc}
              onClick={onAddToCart}
              disabled={disabled}
            >
              <data className={styles.stickyAtcPrice} value={totalPrice}>
                {stickyAtcLabel}
              </data>
            </button>
          </div>
          <div
            className={`${styles.stickyActionsLayer} ${
              justAdded ? styles.stickyActionsLayerVisible : styles.stickyActionsLayerHidden
            }`}
            aria-hidden={!justAdded}
          >
            <Link
              href={`/${lang}/cart`}
              className={styles.stickyAddedLinkPrimary}
              role="status"
              aria-live="polite"
            >
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
