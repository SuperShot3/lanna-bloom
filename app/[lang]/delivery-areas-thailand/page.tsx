import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThailandCoverageMapSection } from '@/components/delivery/ThailandCoverageMapSection';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { buildAlternates } from '@/lib/seo/alternates';
import { listPublicProvinces } from '@/lib/provinces/queries';
import { canEnterCatalog } from '@/lib/provinces/shopAccess';
import { getProvinceStatusLabel } from '@/lib/provinces/statusColors';
import {
  catalogHrefForProvinceCode,
  formatCoverageCategories,
  sortProvincesForCoverageList,
} from '@/lib/delivery/coverageDisplay';
import {
  getChiangMaiDeliveryDistricts,
  getChiangMaiDeliveryNeighborhoods,
  getFlowerDeliveryThailandCopy,
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
  const canonical = `${base}/${params.lang}/delivery-areas-thailand`;
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: buildAlternates({
      lang: params.lang,
      pathSuffix: '/delivery-areas-thailand',
      canonical,
    }),
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: canonical,
    },
  };
}

function AreaPills({
  areas,
  lang,
}: {
  areas: { nameEn: string; nameTh: string }[];
  lang: Locale;
}) {
  const isTh = lang === 'th';
  return (
    <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
      {areas.map((area) => (
        <li
          key={area.nameEn}
          className="px-3.5 py-1.5 rounded-full border border-stone-200 bg-[#FDFCF8] text-stone-600 text-xs sm:text-sm"
        >
          {isTh ? area.nameTh : area.nameEn}
        </li>
      ))}
    </ul>
  );
}

export default async function DeliveryAreasThailandPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isValidLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const copy = getFlowerDeliveryThailandCopy(lang);
  const districts = getChiangMaiDeliveryDistricts();
  const neighborhoods = getChiangMaiDeliveryNeighborhoods();
  const isTh = lang === 'th';
  const provincesResult = await listPublicProvinces();
  const provinces = provincesResult.ok ? provincesResult.provinces : [];
  const shoppableProvinces = sortProvincesForCoverageList(
    provinces.filter((p) => canEnterCatalog(p)),
    lang
  );

  return (
    <div className="guide-page">
      <div className="container">
        <section className="guide-hero !mb-5" aria-labelledby="delivery-areas-h1">
          <h1 id="delivery-areas-h1" className="guide-h1">
            {copy.h1}
          </h1>
          <p className="guide-intro !mt-2 max-w-xl mx-auto text-sm sm:text-[0.95rem]">
            {copy.mapHint}
          </p>
          <div className="mt-4 flex justify-center">
            <Link href={`/${lang}/catalog`} className="hero-cta">
              {copy.ctaCatalog}
            </Link>
          </div>
        </section>

        <ThailandCoverageMapSection lang={lang} initialProvinces={provinces} />

        <section className="guide-section mt-12" aria-labelledby="delivery-coverage-title">
          <h2 id="delivery-coverage-title" className="popular-title text-center">
            {copy.areasTitle}
          </h2>
          <p className="guide-intro max-w-2xl mx-auto text-center mt-3">{copy.intro}</p>
          <p className="guide-browse flex flex-wrap gap-4 justify-center">
            <Link href={`/${lang}`} className="guide-browse-link">
              {copy.ctaChiangMaiGuide}
            </Link>
            <Link
              href={`/${lang}/info/buy-flowers-online-chiang-mai-thailand`}
              className="guide-browse-link"
            >
              {copy.ctaAbroad}
            </Link>
            <Link href={`/${lang}/info/delivery-policy`} className="guide-browse-link">
              {copy.ctaDeliveryPolicy}
            </Link>
          </p>

          <div className="mt-8 rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-9 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3
                id="chiang-mai-delivery-title"
                className="font-[family-name:var(--font-family-display)] text-4xl sm:text-5xl text-[#1A3C34] mb-3 leading-tight"
              >
                {copy.chiangMaiTitle}
              </h3>
              <p className="text-stone-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                {copy.chiangMaiIntro}
              </p>
            </div>

            <div className="mb-8">
              <h4 className="text-xs font-semibold tracking-[0.18em] uppercase text-[#C5A059] mb-3">
                {copy.districtsSubtitle}
              </h4>
              <AreaPills areas={districts} lang={lang} />
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-semibold tracking-[0.18em] uppercase text-[#C5A059] mb-3">
                {copy.neighborhoodsSubtitle}
              </h4>
              <AreaPills areas={neighborhoods} lang={lang} />
            </div>

            <p className="text-stone-400 text-xs sm:text-sm text-center">{copy.chiangMaiNote}</p>
          </div>

          {shoppableProvinces.length > 0 ? (
            <div className="mt-10 max-w-2xl mx-auto">
              <h3 className="popular-title text-center text-xl sm:text-2xl mb-2">
                {copy.otherDestinationsTitle}
              </h3>
              <p className="text-stone-500 text-sm text-center mb-4">{copy.expandingNote}</p>
              <ul className="guide-highlights">
                {shoppableProvinces.map((p) => (
                  <li key={p.province_code}>
                    <Link
                      href={catalogHrefForProvinceCode(lang, p.province_code)}
                      className="text-[#1A3C34] font-medium hover:text-[#C5A059]"
                    >
                      {isTh ? p.province_name_th : p.province_name_en}
                    </Link>
                    <span className="text-stone-500 text-sm">
                      {' '}
                      — {getProvinceStatusLabel(p.status)}
                      {' · '}
                      {formatCoverageCategories(p, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
