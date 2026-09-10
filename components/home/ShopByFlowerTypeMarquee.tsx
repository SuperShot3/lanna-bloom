import Image from 'next/image';
import type { HomeFlowerTypeTile } from '@/lib/catalog/homeFlowerTypeTiles';
import {
  catalogImageUnoptimized,
  HOME_FLOWER_TYPE_TILE_IMAGE_SIZES,
} from '@/lib/catalog/catalogImage';
import { TrackedLink } from '@/components/home/TrackedLink';

export type FlowerTypeMarqueeItem = HomeFlowerTypeTile & {
  label: string;
  href: string;
  /** Defaults to square. Occasion posters are 3:4. */
  imageAspectClass?: string;
  /** Serializable CTA event for GTM (no server→client functions). */
  ctaEvent?: string;
  ctaParams?: Record<string, string>;
};

function FlowerTypeTileLink({ item }: { item: FlowerTypeMarqueeItem }) {
  return (
    <TrackedLink
      href={item.href}
      event={item.ctaEvent}
      eventParams={item.ctaParams}
      className="flower-type-marquee__tile group flex flex-col items-center text-center gap-2 rounded-2xl outline-none transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2"
    >
      <div
        className={`relative ${item.imageAspectClass ?? 'aspect-square'} w-full overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/80 transition-all duration-300 group-hover:ring-[#C5A059]/60`}
        style={{
          aspectRatio: item.imageAspectClass?.includes('3/4')
            ? '3 / 4'
            : item.imageAspectClass?.includes('4/3')
              ? '4 / 3'
              : '1',
        }}
      >
        <Image
          src={item.imageUrl}
          alt={item.label}
          fill
          sizes={HOME_FLOWER_TYPE_TILE_IMAGE_SIZES}
          loading="lazy"
          fetchPriority="low"
          draggable={false}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          unoptimized={catalogImageUnoptimized(item.imageUrl)}
        />
      </div>
      <span className="min-w-0 w-full truncate text-xs sm:text-sm font-medium text-[#1A3C34] transition-colors duration-300 group-hover:text-[#C5A059]">
        {item.label}
      </span>
    </TrackedLink>
  );
}

/** One-line category row: a single list, native horizontal scroll, no loop clone. */
export function ShopByFlowerTypeMarquee({
  items,
  regionLabel,
}: {
  items: FlowerTypeMarqueeItem[];
  regionLabel: string;
}) {
  return (
    <div
      className="flower-type-marquee -mx-4 sm:-mx-6 lg:-mx-8"
      role="region"
      aria-label={regionLabel}
    >
      <div className="flower-type-marquee__group">
        {items.map((item) => (
          <FlowerTypeTileLink key={item.type} item={item} />
        ))}
      </div>
    </div>
  );
}
