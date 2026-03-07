'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CatalogProduct } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackSelectItem } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { computeFinalPrice } from '@/lib/partnerPricing';

export function ProductCard({ product, lang }: { product: CatalogProduct; lang: Locale }) {
  const t = translations[lang].catalog;
  const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
  const href = `/${lang}/catalog/${product.slug}`;
  const imgSrc = product.images?.[0] ?? '';
  const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');
  const finalPrice = computeFinalPrice(product.price, product.commissionPercent);

  const handleLinkClick = () => {
    const item: AnalyticsItem = {
      item_id: product.id,
      item_name: name,
      item_category: product.category,
      price: finalPrice,
      quantity: 1,
      index: 0,
    };
    trackSelectItem('catalog', item);
  };

  return (
    <article className="card">
      <Link
        href={href}
        className="card-link"
        data-ga-select-item="catalog"
        onClick={handleLinkClick}
        aria-label={`${name} — ฿${finalPrice.toLocaleString()}`}
      >
        <div className="card-image-wrap">
          {imgSrc ? (
            <div className="card-image-shared">
              <Image
                src={imgSrc}
                alt={name}
                width={400}
                height={400}
                className="card-image"
                sizes="(max-width: 600px) 50vw, (max-width: 900px) 50vw, 33vw"
                unoptimized={isDataUrl}
                draggable={false}
                style={{ pointerEvents: 'none' }}
              />
            </div>
          ) : (
            <div className="card-image card-image-placeholder" aria-hidden />
          )}
        </div>
        <div className="card-body">
          <div className="card-name" title={name}>
            {name}
          </div>
          <div className="card-price">
            {t.from} ฿{finalPrice.toLocaleString()}
          </div>
        </div>
      </Link>
      <style jsx>{`
        .card {
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          transition: transform 0.2s, box-shadow 0.2s;
          width: 100%;
          max-width: 100%;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }
        .card-link {
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .card-image-wrap {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .card-image-shared {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          transition: transform 0.35s ease;
        }
        .card:hover .card-image-shared {
          transform: scale(1.18);
        }
        .card-image {
          object-fit: cover;
          object-position: top center;
          width: 100%;
          height: 100%;
        }
        .card-image-placeholder {
          width: 100%;
          height: 100%;
          background: var(--pastel-cream);
        }
        .card-body {
          padding: 14px 16px;
        }
        .card-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-price {
          font-size: 0.95rem;
          color: var(--text-muted);
        }
      `}</style>
    </article>
  );
}
