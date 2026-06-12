import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import {
  getFlowerDeliveryThailandCopy,
  getThailandServiceAreas,
} from '@/lib/landingPages/flowerDeliveryThailand';

export const revalidate = 3600;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Lanna Bloom' };
  const copy = getFlowerDeliveryThailandCopy(params.lang);
  const base = getBaseUrl();
  const canonical = `${base}/${params.lang}/flower-delivery-thailand`;
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: canonical,
    },
  };
}

export default function FlowerDeliveryThailandPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isValidLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const copy = getFlowerDeliveryThailandCopy(lang);
  const areas = getThailandServiceAreas();
  const isTh = lang === 'th';

  return (
    <div className="guide-page">
      <div className="container">
        <section className="guide-hero" aria-labelledby="thailand-delivery-h1">
          <h1 id="thailand-delivery-h1" className="guide-h1">
            {copy.h1}
          </h1>
          <p className="guide-intro">{copy.intro}</p>
          <p className="guide-intro text-stone-600">{copy.expandingNote}</p>
          <p className="guide-browse flex flex-wrap gap-4">
            <Link href={`/${lang}/catalog`} className="guide-browse-link">
              {copy.ctaCatalog}
            </Link>
            <Link href={`/${lang}/info/flowers-chiang-mai`} className="guide-browse-link">
              {copy.ctaChiangMaiGuide}
            </Link>
            <Link href={`/${lang}/info/delivery-policy`} className="guide-browse-link">
              {copy.ctaDeliveryPolicy}
            </Link>
          </p>
        </section>

        <section className="guide-section" aria-labelledby="thailand-areas-title">
          <h2 id="thailand-areas-title" className="popular-title">
            {copy.areasTitle}
          </h2>
          <ul className="guide-highlights">
            {areas.map((area) => (
              <li key={area.nameEn}>
                <Link href={area.href(lang)} className="text-[#1A3C34] font-medium hover:text-[#C5A059]">
                  {isTh ? area.nameTh : area.nameEn}
                </Link>
                {area.noteEn ? (
                  <span className="text-stone-500 text-sm">
                    {' '}
                    — {isTh ? area.noteTh : area.noteEn}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
