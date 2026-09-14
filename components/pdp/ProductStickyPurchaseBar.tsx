'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { CartIcon } from '@/components/icons';
import { catalogImageUnoptimized } from '@/lib/catalog/catalogImage';
import styles from './product-pdp.module.css';

const PDP_ATC_SENTINEL_ID = 'pdp-primary-atc';

export function ProductStickyPurchaseBar({
  lang,
  productTitle,
  thumbUrl,
  totalPrice,
  onContinue,
  disabled,
  justAdded = false,
  onVisibilityChange,
}: {
  lang: Locale;
  productTitle: string;
  thumbUrl?: string | null;
  totalPrice: number;
  onContinue: () => void;
  disabled?: boolean;
  justAdded?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);
  const tProduct = translations[lang].product;
  const tCart = translations[lang].cart;
  const stickyContinueLabel = tProduct.continueToGiftDetailsMobile;

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
              sizes="48px"
              className={styles.stickyThumbImg}
              unoptimized={catalogImageUnoptimized(thumbUrl)}
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
              onClick={onContinue}
              disabled={disabled}
            >
              {stickyContinueLabel}
            </button>
          </div>
          <div
            className={`${styles.stickyActionsLayer} ${
              justAdded ? styles.stickyActionsLayerVisible : styles.stickyActionsLayerHidden
            }`}
            aria-hidden={!justAdded}
          >
            <Link href={`/${lang}/cart`} className={styles.stickyAddedLinkPrimary}>
              <CartIcon size={18} />
              {tCart.goToCart}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
