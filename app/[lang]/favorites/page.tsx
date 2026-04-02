'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BouquetCard } from '@/components/BouquetCard';
import type { Bouquet, BouquetSize, SizeKey } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import { getFavorites, FAVORITES_STORAGE_KEY, type FavoriteItem } from '@/lib/favorites';
import { translations } from '@/lib/i18n';

function normalizeSizeKey(raw: string | undefined): SizeKey {
  if (raw === 's' || raw === 'm' || raw === 'l' || raw === 'xl') return raw;
  return 'm';
}

function buildSyntheticBouquet(fav: FavoriteItem): Bouquet {
  const size: BouquetSize = fav.options
    ? {
        optionId:
          fav.options.optionId ??
          (fav.options.sizeKey ? `legacy_${normalizeSizeKey(fav.options.sizeKey)}` : 'legacy_m'),
        key: fav.options.sizeKey ? normalizeSizeKey(fav.options.sizeKey) : 'm',
        label: fav.options.sizeLabel ?? '—',
        price: fav.options.sizePrice ?? fav.price,
        description: '',
        availability: true,
      }
    : {
        optionId: 'legacy_m',
        key: 'm',
        label: '—',
        price: fav.price,
        description: '',
        availability: true,
      };

  return {
    id: fav.id,
    slug: fav.slug,
    nameEn: fav.nameEn ?? fav.name,
    nameTh: fav.nameTh ?? fav.name,
    descriptionEn: '',
    descriptionTh: '',
    compositionEn: '',
    compositionTh: '',
    category: 'favorites',
    images: fav.image ? [fav.image] : [],
    sizes: [size],
  };
}

export default function FavoritesPage({ params }: { params: { lang: string } }) {
  const lang = params.lang as Locale;
  // Defensive: if somehow the route param is invalid, avoid crashes.
  const t = translations[lang].catalog;
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const sync = () => {
      setFavorites(getFavorites());
    };
    sync();

    const onFavoritesUpdated = () => sync();
    window.addEventListener('favorites-updated', onFavoritesUpdated as EventListener);

    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key === FAVORITES_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('favorites-updated', onFavoritesUpdated as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const items = useMemo(() => favorites.map((f) => buildSyntheticBouquet(f)), [favorites]);

  const emptyTitle = 'No favorites yet — explore our flowers';

  return (
    <div className="favorites-page">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="favorites-header">
          <h1 className="favorites-title">Favorites</h1>
        </div>

        {items.length === 0 ? (
          <div className="favorites-empty">
            <p className="favorites-empty-text">{emptyTitle}</p>
            <Link href={`/${lang}/catalog`} className="favorites-empty-link">
              {t.viewAll ?? 'Browse catalog'}
            </Link>
          </div>
        ) : (
          <div className="favorites-grid">
            {items.map((bouquet) => (
              <BouquetCard
                key={bouquet.id}
                bouquet={bouquet}
                lang={lang}
                variant="popular-compact"
                showHoverPanel={false}
                showPartnerBadge={false}
                showFavoriteButton={false}
                persistPreferredSizeOnClick
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .favorites-page {
          width: 100%;
          padding-bottom: 56px; /* visual breathing room above footer */
        }
        .favorites-header {
          padding: 14px 0 10px;
        }
        .favorites-title {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 300;
          font-size: clamp(1.6rem, 4vw, 2.1rem);
          margin: 0;
          color: var(--text);
        }
        .favorites-empty {
          text-align: center;
          padding: 48px 20px;
        }
        .favorites-empty-text {
          margin: 0 0 18px;
          font-size: 1rem;
          color: var(--text-muted);
        }
        .favorites-empty-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 24px;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          border-radius: 9999px;
          transition: transform 0.2s;
        }
        .favorites-empty-link:hover,
        .favorites-empty-link:focus-visible {
          transform: translateY(-2px);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
          width: 100%;
        }
        .favorites-grid > * {
          min-width: 0;
        }
        @media (min-width: 640px) {
          .favorites-grid {
            gap: 20px;
          }
        }
        @media (min-width: 1024px) {
          .favorites-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 24px;
          }
        }
        @media (min-width: 1280px) {
          .favorites-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

