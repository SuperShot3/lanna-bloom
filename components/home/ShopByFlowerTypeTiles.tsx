import Image from 'next/image';
import Link from 'next/link';
import type { HomeFlowerTypeTile } from '@/lib/catalog/homeFlowerTypeTiles';
import {
  catalogImageUnoptimized,
  HOME_FLOWER_TYPE_TILE_IMAGE_SIZES,
} from '@/lib/catalog/catalogImage';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { translations, type Locale } from '@/lib/i18n';

function flowerTypeTileLabel(type: string, home: Record<string, string>, catalog: Record<string, string>): string {
  const tileKey = `flowerTypeTile${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  const catalogKey = `type${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  return home[tileKey] ?? catalog[catalogKey] ?? type;
}

export function ShopByFlowerTypeTiles({
  lang,
  tiles,
}: {
  lang: Locale;
  tiles: HomeFlowerTypeTile[];
}) {
  if (tiles.length === 0) return null;

  const tHome = translations[lang].home;
  const tCatalog = translations[lang].catalog as Record<string, string>;
  const home = tHome as Record<string, string>;

  return (
    <div className="home-reveal-item mb-12 sm:mb-14 last:mb-0">
      <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8">
        {tHome.shopByFlowerTypeTitle}
      </h2>
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {tiles.map((tile) => {
          const label = flowerTypeTileLabel(tile.type, home, tCatalog);
          return (
            <Link
              key={tile.type}
              href={`/${lang}/catalog${buildCatalogSearchString({ types: [tile.type] })}`}
              className="group flex flex-col items-center text-center gap-2 rounded-2xl outline-none transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/80 transition-all duration-300 group-hover:ring-[#C5A059]/60">
                <Image
                  src={tile.imageUrl}
                  alt={label}
                  fill
                  sizes={HOME_FLOWER_TYPE_TILE_IMAGE_SIZES}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  unoptimized={catalogImageUnoptimized(tile.imageUrl)}
                />
              </div>
              <span className="min-w-0 w-full truncate text-xs sm:text-sm font-medium text-[#1A3C34] transition-colors duration-300 group-hover:text-[#C5A059]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
