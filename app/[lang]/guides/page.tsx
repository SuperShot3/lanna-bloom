import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';

const GUIDE_SLUGS = [
  'birthday-flower-gift',
  'flowers-chiang-mai',
  'rose-bouquets-chiang-mai',
  'same-day-flower-delivery-chiang-mai',
] as const;

type GuideSlug = (typeof GUIDE_SLUGS)[number];

function guideCardCopy(locale: Locale, slug: GuideSlug) {
  const g = translations[locale].guides;
  const hub = g.hub;
  switch (slug) {
    case 'birthday-flower-gift':
      return {
        title: hub.birthdayFlowerGiftTitle,
        excerpt: hub.birthdayFlowerGiftExcerpt,
      };
    case 'flowers-chiang-mai':
      return {
        title: g.flowersChiangMai.h1,
        excerpt: hub.flowersChiangMaiExcerpt,
      };
    case 'rose-bouquets-chiang-mai':
      return {
        title: g.roseBouquetsChiangMai.h1,
        excerpt: hub.roseBouquetsChiangMaiExcerpt,
      };
    case 'same-day-flower-delivery-chiang-mai':
      return {
        title: g.sameDayFlowerDeliveryChiangMai.h1,
        excerpt: hub.sameDayFlowerDeliveryChiangMaiExcerpt,
      };
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const { lang } = params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const locale = lang as Locale;
  const hub = translations[locale].guides.hub;
  const base = getBaseUrl();
  return {
    title: hub.metaTitle,
    description: hub.metaDescription,
    alternates: {
      canonical: `${base}/${lang}/guides`,
    },
  };
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'th' }];
}

export default function GuidesHubPage({ params }: { params: { lang: string } }) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const hub = translations[locale].guides.hub;
  const infoHref = `/${locale}/info`;

  return (
    <div className="guide-page">
      <div className="container guide-content-max">
        <section className="guide-hero" aria-labelledby="guides-hub-h1">
          <h1 id="guides-hub-h1" className="guide-h1">
            {hub.h1}
          </h1>
          <p className="guide-intro">{hub.intro}</p>
          <p className="guide-hub-info-link-wrap">
            <Link href={infoHref} className="guide-browse-link">
              {hub.articlesLink}
            </Link>
          </p>
        </section>

        <section className="guide-section" aria-labelledby="guides-hub-list-title">
          <h2 id="guides-hub-list-title" className="sr-only">
            {hub.readGuide}
          </h2>
          <ul className="guide-hub-list">
            {GUIDE_SLUGS.map((slug) => {
              const { title, excerpt } = guideCardCopy(locale, slug);
              return (
                <li key={slug} className="guide-hub-item">
                  <Link href={`/${locale}/guides/${slug}`} className="guide-hub-card">
                    <span className="guide-hub-card-title">{title}</span>
                    <span className="guide-hub-card-excerpt">{excerpt}</span>
                    <span className="guide-hub-card-cta">{hub.readGuide}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
