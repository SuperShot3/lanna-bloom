import type { HomeFlowerTypeTile } from '@/lib/catalog/homeFlowerTypeTiles';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { translations, type Locale } from '@/lib/i18n';
import { ShopByFlowerTypeMarquee } from '@/components/home/ShopByFlowerTypeMarquee';

function flowerTypeTileLabel(type: string, home: Record<string, string>, catalog: Record<string, string>): string {
  const tileKey = `flowerTypeTile${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  const catalogKey = `type${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  return home[tileKey] ?? catalog[catalogKey] ?? type;
}

export function ShopByFlowerTypeTiles({
  lang,
  tiles,
  catalogHref,
}: {
  lang: Locale;
  tiles: HomeFlowerTypeTile[];
  /** Catalog listing path, e.g. `/en/catalog` or `/en/catalog/pattaya`. */
  catalogHref?: string;
}) {
  if (tiles.length === 0) return null;

  const tHome = translations[lang].home;
  const tCatalog = translations[lang].catalog as Record<string, string>;
  const home = tHome as Record<string, string>;
  const catalogBase = catalogHref ?? `/${lang}/catalog`;

  const items = tiles.map((tile) => ({
    ...tile,
    label: flowerTypeTileLabel(tile.type, home, tCatalog),
    href: `${catalogBase}${buildCatalogSearchString({ types: [tile.type] })}`,
  }));

  return (
    <div className="home-reveal-item mb-12 sm:mb-14 last:mb-0">
      <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8">
        {tHome.shopByFlowerTypeTitle}
      </h2>
      <ShopByFlowerTypeMarquee items={items} regionLabel={tHome.shopByFlowerTypeTitle} />
    </div>
  );
}
