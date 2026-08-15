import type { HomeOccasionTile } from '@/lib/catalog/homeOccasionTiles';
import { CATALOG_OCCASION_CHIPS } from '@/lib/catalogCategories';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { translations, type Locale } from '@/lib/i18n';
import { ShopByFlowerTypeMarquee } from '@/components/home/ShopByFlowerTypeMarquee';

function occasionTileLabel(occasion: string, catalog: Record<string, string>): string {
  const chip = CATALOG_OCCASION_CHIPS.find((c) => c.value === occasion);
  if (chip) return catalog[chip.labelKey] ?? occasion;
  return occasion;
}

export function ShopByOccasionTiles({
  lang,
  tiles,
  catalogHref,
}: {
  lang: Locale;
  tiles: HomeOccasionTile[];
  /** Catalog listing path, e.g. `/en/catalog` or `/en/catalog/pattaya`. */
  catalogHref?: string;
}) {
  if (tiles.length === 0) return null;

  const tHome = translations[lang].home;
  const tCatalog = translations[lang].catalog as Record<string, string>;
  const catalogBase = catalogHref ?? `/${lang}/catalog`;

  const items = tiles.map((tile) => ({
    type: tile.occasion,
    imageUrl: tile.imageUrl,
    label: occasionTileLabel(tile.occasion, tCatalog),
    href: `${catalogBase}${buildCatalogSearchString({ occasion: tile.occasion })}`,
  }));

  return (
    <div className="home-reveal-item mb-12 sm:mb-14 last:mb-0">
      <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8">
        {tHome.shopByOccasionTitle}
      </h2>
      <ShopByFlowerTypeMarquee items={items} regionLabel={tHome.shopByOccasionTitle} />
    </div>
  );
}
