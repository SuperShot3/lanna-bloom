import Image from 'next/image';
import Link from 'next/link';
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
    </article>
  );
}

/** Lightweight homepage bouquet card — image, name, price, PDP link. No BouquetCard JS. */
export function HomeBouquetCard({
  bouquet,
  lang,
}: {
  bouquet: Bouquet;
  lang: Locale;
}) {
  const name = lang === 'th' && bouquet.nameTh ? bouquet.nameTh : bouquet.nameEn;
  const href = buildCatalogItemHref({ lang, slug: bouquet.slug });
  const minPrice = bouquet.sizes?.length ? Math.min(...bouquet.sizes.map((s) => s.price)) : 0;
  const priceThb = applyCatalogDiscountThb(minPrice, bouquet.discountPercent);
  const imageUrl = firstStorefrontRenderableImageUrl(bouquet.images);
  const imageAlt = bouquet.imageAlts?.[0]?.trim() || name;

  return (
    <HomeCardShell
      href={href}
      name={name}
      priceThb={priceThb}
      imageUrl={imageUrl}
      imageAlt={imageAlt}
    />
  );
}

/** Lightweight homepage product card — image, name, price, PDP link. No ProductCard JS. */
export function HomeProductCard({
  product,
  lang,
}: {
  product: CatalogProduct;
  lang: Locale;
}) {
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const href = buildCatalogItemHref({ lang, slug: product.slug });
  const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
  const sizes = (product.sizes ?? []).filter((s) => s.availability !== false);
  const listBase = sizes.length > 1 ? Math.min(...sizes.map((s) => s.price)) : finalPrice;
  const priceThb = applyCatalogDiscountThb(listBase, product.discountPercent);
  const imageUrl = firstStorefrontRenderableImageUrl(product.images);
  const imageAlt = product.imageAlts?.[0]?.trim() || name;

  return (
    <HomeCardShell
      href={href}
      name={name}
      priceThb={priceThb}
      imageUrl={imageUrl}
      imageAlt={imageAlt}
    />
  );
}
