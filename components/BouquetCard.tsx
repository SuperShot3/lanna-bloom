'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bouquet } from '@/lib/bouquets';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export function BouquetCard({ bouquet, lang }: { bouquet: Bouquet; lang: Locale }) {
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
  const minPrice = bouquet.sizes?.length
    ? Math.min(...bouquet.sizes.map((s) => s.price))
    : 0;
  const href = `/${lang}/catalog/${bouquet.slug}`;
  const t = translations[lang].catalog;
  const imgSrc = bouquet.images?.[0] || '';
  const isDataUrl = typeof imgSrc === 'string' && imgSrc.startsWith('data:');

  return (
    <article className="card">
      <Link href={href} className="card-link">
        <div className="card-image-wrap">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={name}
              width={400}
              height={400}
              className="card-image"
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              unoptimized={isDataUrl}
            />
          ) : (
            <div className="card-image card-image-placeholder" aria-hidden />
          )}
        </div>
        <div className="card-body">
          <h2 className="card-title">{name}</h2>
          <p className="card-price">
            {t.from} ฿{minPrice.toLocaleString()}
          </p>
          <p className="card-delivery">{t.deliveryNote}</p>
          <span className="card-cta">{t.viewDetails}</span>
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
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }
        .card-link {
          display: block;
          color: inherit;
        }
        .card-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: var(--radius);
        }
        .card-image-wrap {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--pastel-cream);
        }
        .card-image,
        .card-image-placeholder {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-image-placeholder {
          background: var(--pastel-cream);
          min-height: 100%;
        }
        .card-body {
          padding: 16px;
        }
        .card-title {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 6px;
          color: var(--text);
        }
        .card-price {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin: 0 0 6px;
        }
        .card-delivery {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 10px;
          line-height: 1.35;
        }
        .card-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 8px 18px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          background: transparent;
          border: 2px solid var(--accent);
          border-radius: 9999px;
          transition: background 0.2s, color 0.2s, transform 0.2s;
        }
        .card-link:hover .card-cta {
          background: var(--accent-soft);
          color: var(--text);
        }
      `}</style>
    </article>
  );
}
