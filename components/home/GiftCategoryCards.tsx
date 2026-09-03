import Image from 'next/image';
import { catalogImageUnoptimized } from '@/lib/catalog/catalogImage';
import { StorefrontIcon } from '@/components/icons';
import { TrackedLink } from '@/components/home/TrackedLink';

export type GiftCategoryCardData = {
  categoryKey: 'plushy_toys' | 'balloons';
  href: string;
  imageUrl: string;
  title: string;
  cta: string;
};

export function GiftCategoryCards({
  heading,
  cards,
}: {
  heading: string;
  cards: GiftCategoryCardData[];
}) {
  if (cards.length === 0) return null;

  return (
    <section
      className="home-cv-auto pt-4 pb-12 sm:pt-5 sm:pb-14 lg:pt-6 lg:pb-16 bg-stone-50"
      aria-labelledby="home-gifts-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="home-gifts-title"
          className="home-reveal-item font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8"
        >
          {heading}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 home-reveal-stagger">
          {cards.map((card) => (
            <TrackedLink
              key={card.categoryKey}
              href={card.href}
              event="cta_home_gift_category"
              eventParams={{ category: card.categoryKey }}
              className="home-reveal-item group relative overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#C5A059]/60 hover:shadow-lg"
            >
              <div
                className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100"
                style={{ aspectRatio: '4 / 3' }}
              >
                <Image
                  src={card.imageUrl}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 92vw, 50vw"
                  loading="lazy"
                  fetchPriority="low"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  unoptimized={catalogImageUnoptimized(card.imageUrl)}
                />
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="font-[family-name:var(--font-family-display)] text-xl sm:text-2xl text-[#1A3C34] mb-2">
                  {card.title}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C5A059] group-hover:gap-2.5 transition-all">
                  {card.cta}
                  <StorefrontIcon name="arrow-forward" size={16} />
                </span>
              </div>
            </TrackedLink>
          ))}
        </div>
      </div>
    </section>
  );
}
