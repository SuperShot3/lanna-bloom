'use client';

import { useEffect, useRef, useState, type ComponentType, type RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { Locale } from '@/lib/i18n';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import { computeFinalPrice } from '@/lib/partnerPricing';
import {
  catalogImageUnoptimized,
  CATALOG_CARD_IMAGE_SIZES,
  firstStorefrontRenderableImageUrl,
} from '@/lib/catalog/catalogImage';
import { buildCatalogItemHref } from '@/lib/delivery/marketRoute';

const ROOT_MARGIN = '600px 0px';

export const HOME_EAGER_CARD_COUNT = 4;

type BouquetCardCmp = ComponentType<{
  bouquet: Bouquet;
  lang: Locale;
  variant: 'popular-compact';
}>;
type ProductCardCmp = ComponentType<{ product: CatalogProduct; lang: Locale }>;

function formatThb(amount: number): string {
  return `฿${Math.max(0, Math.round(amount)).toLocaleString('en-US')}`;
}

function HomeCardShell({
  href,
  name,
  priceThb,
  imageUrl,
  imageAlt,
}: {
  href: string;
  name: string;
  priceThb: number;
  imageUrl: string | null;
  imageAlt: string;
}) {
  return (
    <article className="home-card-shell">
      <Link href={href} className="home-card-shell__link" aria-label={`${name} — ${formatThb(priceThb)}`}>
        <div className="home-card-shell__image">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={400}
              height={400}
              sizes={CATALOG_CARD_IMAGE_SIZES}
              loading="lazy"
              fetchPriority="low"
              className="home-card-shell__img"
              unoptimized={catalogImageUnoptimized(imageUrl)}
            />
          ) : (
            <div className="home-card-shell__img home-card-shell__placeholder" aria-hidden />
          )}
        </div>
        <div className="home-card-shell__body">
          <div className="home-card-shell__name" title={name}>
            {name}
          </div>
          <div className="home-card-shell__price">{formatThb(priceThb)}</div>
        </div>
      </Link>
      <style jsx>{`
        .home-card-shell {
          position: relative;
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          width: 100%;
          height: 100%;
          min-width: 0;
        }
        .home-card-shell__link {
          display: flex;
          flex-direction: column;
          height: 100%;
          color: inherit;
          text-decoration: none;
          min-width: 0;
        }
        .home-card-shell__image {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--pastel-cream);
          border-radius: var(--radius);
        }
        .home-card-shell__img,
        .home-card-shell__placeholder {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .home-card-shell__placeholder {
          background: var(--pastel-cream);
        }
        .home-card-shell__body {
          padding: 11px 12px 13px;
          min-height: 92px;
          min-width: 0;
        }
        .home-card-shell__name {
          font-family: var(--font-serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          opacity: 0.6;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
        }
        .home-card-shell__price {
          font-size: 17px;
          font-weight: 700;
          color: var(--text);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </article>
  );
}

function useHydrateOnVisible<T>(eager: boolean, load: () => Promise<T>): {
  value: T | null;
  observeRef: RefObject<HTMLDivElement>;
} {
  const [value, setValue] = useState<T | null>(null);
  const observeRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      loadRef.current().then((next) => {
        if (!cancelled) setValue(() => next);
      });
    };

    if (eager) {
      run();
      return () => {
        cancelled = true;
      };
    }

    const el = observeRef.current;
    if (!el) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        run();
        io.disconnect();
      },
      { root: null, rootMargin: ROOT_MARGIN, threshold: 0.01 }
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [eager]);

  return { value, observeRef };
}

export function DeferredHomeBouquetCard({
  bouquet,
  lang,
  eager = false,
}: {
  bouquet: Bouquet;
  lang: Locale;
  eager?: boolean;
}) {
  const pathname = usePathname();
  const { value: Card, observeRef } = useHydrateOnVisible<BouquetCardCmp>(eager, () =>
    import('@/components/BouquetCard').then((m) => m.BouquetCard)
  );
  const name = lang === 'th' && bouquet.nameTh ? bouquet.nameTh : bouquet.nameEn;
  const href = buildCatalogItemHref({ lang, slug: bouquet.slug, pathname });
  const minPrice = bouquet.sizes?.length ? Math.min(...bouquet.sizes.map((s) => s.price)) : 0;
  const priceThb = applyCatalogDiscountThb(minPrice, bouquet.discountPercent);
  const imageUrl = firstStorefrontRenderableImageUrl(bouquet.images);
  const imageAlt = bouquet.imageAlts?.[0]?.trim() || name;

  if (Card) {
    return <Card bouquet={bouquet} lang={lang} variant="popular-compact" />;
  }

  return (
    <div ref={observeRef}>
      <HomeCardShell
        href={href}
        name={name}
        priceThb={priceThb}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
      />
    </div>
  );
}

export function DeferredHomeProductCard({
  product,
  lang,
  eager = false,
}: {
  product: CatalogProduct;
  lang: Locale;
  eager?: boolean;
}) {
  const pathname = usePathname();
  const { value: Card, observeRef } = useHydrateOnVisible<ProductCardCmp>(eager, () =>
    import('@/components/ProductCard').then((m) => m.ProductCard)
  );
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const href = buildCatalogItemHref({ lang, slug: product.slug, pathname });
  const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
  const sizes = (product.sizes ?? []).filter((s) => s.availability !== false);
  const listBase = sizes.length > 1 ? Math.min(...sizes.map((s) => s.price)) : finalPrice;
  const priceThb = applyCatalogDiscountThb(listBase, product.discountPercent);
  const imageUrl = firstStorefrontRenderableImageUrl(product.images);
  const imageAlt = product.imageAlts?.[0]?.trim() || name;

  if (Card) {
    return <Card product={product} lang={lang} />;
  }

  return (
    <div ref={observeRef}>
      <HomeCardShell
        href={href}
        name={name}
        priceThb={priceThb}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
      />
    </div>
  );
}
