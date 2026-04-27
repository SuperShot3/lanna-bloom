import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import { GuideFaq } from '@/app/[lang]/guides/flowers-chiang-mai/GuideFaq';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { getBaseUrl } from '@/lib/orders';
import {
  getBouquetsFilteredFromSanity,
  getPlushyToysFilteredFromSanity,
  type CatalogProduct,
} from '@/lib/sanity';
import {
  getCollectionLandingPage,
  getCollectionLandingPages,
  getCollectionLandingTabs,
} from '@/lib/landingPages/collectionLandingPages';
import styles from './CollectionLandingPage.module.css';

export const revalidate = 60;

const MAX_BOUQUETS = 6;
const MAX_ADD_ONS = 3;

function selectRandomAddOns(products: CatalogProduct[]): CatalogProduct[] {
  return [...products]
    .sort(() => Math.random() - 0.5)
    .slice(0, MAX_ADD_ONS);
}

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    getCollectionLandingPages().map((page) => ({
      lang,
      slug: page.slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  const { lang, slug } = params;
  const page = getCollectionLandingPage(slug);
  if (!page || !isValidLocale(lang)) return { title: 'Lanna Bloom' };

  const locale = lang as Locale;
  const copy = page.copy[locale];
  const canonical = `${getBaseUrl()}/${locale}${page.canonicalPath}`;

  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      url: canonical,
      siteName: 'Lanna Bloom',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      type: 'website',
    },
    robots: page.noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function CollectionLandingPage({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  const { lang, slug } = params;
  if (!isValidLocale(lang)) notFound();

  const page = getCollectionLandingPage(slug);
  if (!page) notFound();

  const locale = lang as Locale;
  const copy = page.copy[locale];
  const catalogHref = `/${locale}/catalog${buildCatalogSearchString(page.filters)}`;
  const addOnsHref = `/${locale}/catalog${buildCatalogSearchString({ topCategory: 'plushy_toys' })}`;
  const allRosesHref = `/${locale}/catalog${buildCatalogSearchString({
    topCategory: 'flowers',
    types: ['rose'],
  })}`;

  const [allBouquets, plushyToys] = await Promise.all([
    getBouquetsFilteredFromSanity(page.filters),
    getPlushyToysFilteredFromSanity({ sort: 'newest' }),
  ]);

  const bouquets = allBouquets.slice(0, MAX_BOUQUETS);
  const addOns = selectRandomAddOns(plushyToys);
  const heroImage = bouquets[0]?.images?.[0];
  const tabs = getCollectionLandingTabs(locale);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="collection-landing-h1">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 id="collection-landing-h1" className={styles.h1}>
              {copy.h1}
            </h1>
            <p className={styles.intro}>{copy.intro}</p>
            <div className={styles.heroActions}>
              <Link href="#collection-products" className={styles.primaryCta}>
                {copy.primaryCta}
              </Link>
              <p className={styles.deliveryNote}>{copy.deliveryNote}</p>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden={!heroImage}>
            <div className={styles.heroImageFrame}>
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt=""
                  width={720}
                  height={720}
                  sizes="(max-width: 900px) 90vw, 45vw"
                  className={styles.heroImage}
                  unoptimized={heroImage.startsWith('data:')}
                  priority
                />
              ) : (
                <div className={styles.heroPlaceholder} />
              )}
            </div>
            <div className={styles.heroBadge}>{locale === 'th' ? 'จัดส่งวันเดียว เชียงใหม่' : 'Same-day Delivery Chiang Mai'}</div>
          </div>
        </section>

        <nav className={styles.tabs} aria-label={locale === 'th' ? 'คอลเลกชันกุหลาบ' : 'Rose collections'}>
          {tabs.map((tab) => (
            <Link
              key={tab.slug}
              href={tab.href}
              className={`${styles.tab} ${tab.slug === page.slug ? styles.tabActive : ''}`}
              aria-current={tab.slug === page.slug ? 'page' : undefined}
            >
              <span className={styles.tabImageWrap} aria-hidden>
                <Image
                  src={tab.imageSrc}
                  alt=""
                  width={176}
                  height={176}
                  sizes="(max-width: 640px) 68px, 88px"
                  className={styles.tabImage}
                  unoptimized={tab.imageSrc.endsWith('.svg')}
                />
              </span>
              <span className={styles.tabCopy}>
                <span className={styles.tabLabel}>{tab.label}</span>
                <span className={styles.tabHint}>
                  {locale === 'th' ? 'คอลเลกชันในเชียงใหม่' : 'Chiang Mai collection'}
                </span>
              </span>
              <span className={styles.tabArrow} aria-hidden>
                →
              </span>
            </Link>
          ))}
        </nav>

        <section id="collection-products" className={styles.section} aria-labelledby="collection-products-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="collection-products-title" className={styles.sectionTitle}>
                {copy.collectionTitle}
              </h2>
              <p className={styles.sectionIntro}>{copy.collectionIntro}</p>
            </div>
            <Link href={catalogHref} className={styles.sectionLink}>
              {locale === 'th' ? 'ดูทั้งหมด' : 'View all'}
            </Link>
          </div>

          {bouquets.length > 0 ? (
            <div className={styles.productGrid}>
              {bouquets.map((bouquet) => (
                <BouquetCard
                  key={bouquet.id}
                  bouquet={bouquet}
                  lang={locale}
                  alwaysShowActions
                  showFavoriteButton={false}
                  showPartnerBadge={false}
                  persistPreferredSizeOnClick
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>{copy.emptyTitle}</strong>
              <p>{copy.emptyText}</p>
              <Link href={allRosesHref} className={styles.sectionLink}>
                {locale === 'th' ? 'ดูช่อกุหลาบทั้งหมด' : 'Browse all roses'}
              </Link>
            </div>
          )}
        </section>

        {addOns.length > 0 ? (
          <section className={styles.section} aria-labelledby="collection-add-ons-title">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="collection-add-ons-title" className={styles.sectionTitle}>
                  {copy.addOnsTitle}
                </h2>
                <p className={styles.sectionIntro}>{copy.addOnsIntro}</p>
              </div>
              <Link href={addOnsHref} className={styles.sectionLink}>
                {locale === 'th' ? 'ดูของเสริมทั้งหมด' : 'View all add-ons'}
              </Link>
            </div>
            <div className={styles.addOnGrid}>
              {addOns.map((product) => (
                <ProductCard key={`${product.catalogKind}-${product.id}`} product={product} lang={locale} alwaysShowActions />
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section} aria-label={locale === 'th' ? 'จุดเด่นบริการ' : 'Service highlights'}>
          <div className={styles.trustBand}>
            {copy.trustItems.map((item) => (
              <div key={item.title} className={styles.trustItem}>
                <p className={styles.trustTitle}>{item.title}</p>
                <p className={styles.trustText}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.infoGrid}`} aria-label={locale === 'th' ? 'ข้อมูลเพิ่มเติม' : 'Additional information'}>
          <div className={styles.deliveryCard}>
            <h2>{copy.deliveryTitle}</h2>
            <p>{copy.deliveryText}</p>
          </div>
          <div className={styles.linksCard}>
            <h2>{locale === 'th' ? 'เลือกซื้อเพิ่มเติม' : 'Helpful links'}</h2>
            <div className={styles.internalLinks}>
              <Link href={catalogHref}>{copy.collectionTitle}</Link>
              <Link href={allRosesHref}>{locale === 'th' ? 'กุหลาบทั้งหมด' : 'All rose bouquets'}</Link>
              <Link href={`/${locale}/guides/rose-bouquets-chiang-mai`}>
                {locale === 'th' ? 'คู่มือช่อกุหลาบ' : 'Rose bouquet guide'}
              </Link>
              <Link href={`/${locale}/contact`}>{locale === 'th' ? 'ติดต่อเรา' : 'Contact us'}</Link>
            </div>
          </div>
        </section>

        <GuideFaq faq={copy.faq} title={copy.faqTitle} />
      </div>
    </main>
  );
}
