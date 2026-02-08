import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPopularBouquetsFromSanity } from '@/lib/sanity';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { BouquetCard } from '@/components/BouquetCard';
import { MessengerOrderButtons } from '@/components/MessengerOrderButtons';
import { GuideFaq } from './GuideFaq';

const POPULAR_LIMIT = 6;
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const { lang } = params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const locale = lang as Locale;
  const title =
    locale === 'en'
      ? 'Flower Delivery in Chiang Mai | Lanna Bloom'
      : 'ส่งดอกไม้ในเชียงใหม่ | Lanna Bloom';
  const description =
    locale === 'en'
      ? 'Order fresh bouquets online with delivery across Chiang Mai. Easy ordering via LINE or WhatsApp.'
      : 'สั่งช่อดอกไม้ออนไลน์ พร้อมบริการจัดส่งในเชียงใหม่ สั่งง่ายผ่าน LINE หรือ WhatsApp';
  const base = getBaseUrl();
  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${lang}/guides/flowers-chiang-mai`,
    },
  };
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'th' }];
}

export default async function FlowersChiangMaiGuidePage({
  params,
}: {
  params: { lang: string };
}) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const t = translations[locale].guides.flowersChiangMai;
  const tHome = translations[locale].home;
  const bouquets = await getPopularBouquetsFromSanity(POPULAR_LIMIT);
  const catalogHref = `/${lang}/catalog`;

  return (
    <div className="guide-page">
      <div className="container">
        {/* A) Hero */}
        <section className="guide-hero" aria-labelledby="guide-h1">
          <h1 id="guide-h1" className="guide-h1">
            {t.h1}
          </h1>
          <p className="guide-intro">{t.intro}</p>
          <MessengerOrderButtons
            lang={locale}
            prebuiltMessage={t.prefillMessage}
            pageLocation="guide"
          />
        </section>

        {/* B) Highlights */}
        <section className="guide-section" aria-labelledby="guide-highlights-title">
          <h2 id="guide-highlights-title" className="sr-only">
            {locale === 'en' ? 'Highlights' : 'จุดเด่น'}
          </h2>
          <ul className="guide-highlights">
            {t.highlights.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* C) Popular bouquets */}
        <section className="guide-section popular-section" aria-labelledby="guide-popular-title">
          <h2 id="guide-popular-title" className="popular-title">
            {tHome.popularTitle}
          </h2>
          <div className="popular-grid">
            {bouquets.map((bouquet) => (
              <BouquetCard key={bouquet.id} bouquet={bouquet} lang={locale} />
            ))}
          </div>
          <p className="guide-browse">
            <Link href={catalogHref} className="guide-browse-link">
              {t.browseAll}
            </Link>
          </p>
        </section>

        {/* D) Delivery area */}
        <section className="guide-section" aria-labelledby="guide-delivery-title">
          <h2 id="guide-delivery-title" className="sr-only">
            {locale === 'en' ? 'Delivery area' : 'พื้นที่จัดส่ง'}
          </h2>
          <p className="guide-delivery-area">{t.deliveryArea}</p>
        </section>

        {/* E) FAQ accordion */}
        <GuideFaq
          faq={t.faq}
          title={locale === 'en' ? 'Frequently Asked Questions' : 'คำถามที่พบบ่อย'}
        />
      </div>
    </div>
  );
}
