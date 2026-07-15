import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import { GuideFaq } from '@/app/[lang]/info/_components/GuideFaq';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import {
  getCollectionHub,
  getCollectionLandingPages,
  getCollectionLandingTabs,
  getHubCatalogView,
  getRoseColorFromLegacySlug,
  ROSES_HUB_PATH,
  type HubFlowerType,
} from '@/lib/landingPages/collectionLandingPages';
import { getBaseUrl } from '@/lib/orders';
import {
  getBalloonsFilteredFromSanity,
  getBouquetsFilteredFromSanity,
  getPlushyToysFilteredFromSanity,
  type CatalogProduct,
} from '@/lib/sanity';
import styles from './CollectionLandingPage.module.css';

export const revalidate = 60;

const MAX_BOUQUETS = 6;
const MAX_ADD_ONS_PER_TYPE = 3;

const TRUST_ICONS = [
  (
    <svg key="delivery" viewBox="0 0 24 24" focusable="false">
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h3.5l2.5 3v2h-6z" />
      <path d="M6.5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M17.5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  ),
  (
    <svg key="payment" viewBox="0 0 24 24" focusable="false">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  (
    <svg key="message" viewBox="0 0 24 24" focusable="false">
      <path d="M5 6h14v10H9l-4 3z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  ),
  (
    <svg key="checkout" viewBox="0 0 24 24" focusable="false">
      <path d="M4 12l4 4L19 5" />
      <path d="M5 19h14" />
    </svg>
  ),
] as const;

function selectRandomAddOns(products: CatalogProduct[], limit = MAX_ADD_ONS_PER_TYPE): CatalogProduct[] {
  return [...products]
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
}

function flowerTypeUi(flowerType: HubFlowerType, locale: Locale) {
  if (flowerType === 'orchid') {
    return locale === 'th'
      ? {
          tabsAria: 'คอลเลกชันกล้วยไม้',
          browseAll: 'ดูกล้วยไม้ทั้งหมด',
          allInCatalog: 'กล้วยไม้ทั้งหมด',
        }
      : {
          tabsAria: 'Orchid collections',
          browseAll: 'Browse all orchids',
          allInCatalog: 'All orchids',
        };
  }
  return locale === 'th'
    ? {
        tabsAria: 'คอลเลกชันกุหลาบ',
        browseAll: 'ดูช่อกุหลาบทั้งหมด',
        allInCatalog: 'กุหลาบทั้งหมด',
      }
    : {
        tabsAria: 'Rose collections',
        browseAll: 'Browse all roses',
        allInCatalog: 'All rose bouquets',
      };
}

function interleaveAddOns(groups: CatalogProduct[][]): CatalogProduct[] {
  const maxLength = Math.max(...groups.map((group) => group.length), 0);
  const result: CatalogProduct[] = [];

  for (let i = 0; i < maxLength; i++) {
    for (const group of groups) {
      const item = group[i];
      if (item) result.push(item);
    }
  }

  return result;
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
  const hub = getCollectionHub(slug);
  if (!isValidLocale(lang) || !hub) return { title: 'Lanna Bloom' };

  const locale = lang as Locale;
  const copy = hub.copy[locale];
  const canonical = `${getBaseUrl()}/${locale}${hub.canonicalPath}`;

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
  };
}

export default async function CollectionLandingPage({
  params,
  searchParams,
}: {
  params: { lang: string; slug: string };
  searchParams: { color?: string | string[] };
}) {
  const { lang, slug } = params;
  if (!isValidLocale(lang)) notFound();

  const locale = lang as Locale;
  const legacyColor = getRoseColorFromLegacySlug(slug);
  if (legacyColor) {
    redirect(`/${locale}${ROSES_HUB_PATH}?color=${legacyColor}`);
  }

  const hub = getCollectionHub(slug);
  if (!hub) notFound();

  if (!hub.colorTabs && searchParams.color) {
    redirect(`/${locale}${hub.canonicalPath}`);
  }

  const catalogView = getHubCatalogView(hub, locale, searchParams.color);
  const hubCopy = hub.copy[locale];
  const catalogHref = `/${locale}/catalog${buildCatalogSearchString(catalogView.filters)}`;
  const addOnsHref = `/${locale}/catalog${buildCatalogSearchString({ topCategory: 'balloons' })}`;
  const allFlowerTypeHref = `/${locale}/catalog${buildCatalogSearchString({
    topCategory: 'flowers',
    types: [hub.flowerType],
  })}`;
  const flowerTypeLabels = flowerTypeUi(hub.flowerType, locale);

  const [allBouquets, plushyToys, balloons] = await Promise.all([
    getBouquetsFilteredFromSanity({
      ...catalogView.filters,
      catalogDeliveryDestination: 'CHIANG_MAI',
    }),
    getPlushyToysFilteredFromSanity({ sort: 'newest' }),
    getBalloonsFilteredFromSanity({ sort: 'newest' }),
  ]);

  const bouquets = hub.colorTabs ? allBouquets.slice(0, MAX_BOUQUETS) : allBouquets;
  const addOns = interleaveAddOns([
    selectRandomAddOns(plushyToys),
    selectRandomAddOns(balloons),
  ]);
  const heroImage = bouquets[0]?.images?.[0];
  const tabs = getCollectionLandingTabs(hub, locale);
  const activeColor = catalogView.activeColor;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="collection-landing-h1">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{hubCopy.eyebrow}</p>
            <h1 id="collection-landing-h1" className={styles.h1}>
              {hubCopy.h1}
            </h1>
            <p className={styles.intro}>{hubCopy.intro}</p>
            <div className={styles.heroActions}>
              <Link href="#collection-products" className={styles.primaryCta}>
                {hubCopy.primaryCta}
              </Link>
              <p className={styles.deliveryNote}>{hubCopy.deliveryNote}</p>
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

        {tabs.length > 0 ? (
          <nav className={styles.tabs} aria-label={flowerTypeLabels.tabsAria}>
            {tabs.map((tab) => (
              <Link
                key={tab.colorFilter}
                href={tab.href}
                className={`${styles.tab} ${tab.colorFilter === activeColor ? styles.tabActive : ''}`}
                aria-current={tab.colorFilter === activeColor ? 'page' : undefined}
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
        ) : null}

        {hub.flowerType === 'orchid' && hubCopy.orchidTypes && hubCopy.orchidTypes.length > 0 ? (
          <section className={styles.section} aria-labelledby="orchid-types-title">
            <div className={styles.typesSection}>
              <h2 id="orchid-types-title" className={styles.typesTitle}>
                {hubCopy.typesTitle}
              </h2>
              <p className={styles.typesIntro}>{hubCopy.typesIntro}</p>
              <ul className={styles.typesList}>
                {hubCopy.orchidTypes.map((type) => (
                  <li key={type.name} className={styles.typeCard}>
                    <h3 className={styles.typeName}>{type.name}</h3>
                    <p className={styles.typeAliases}>{type.aliases}</p>
                    <p className={styles.typeDescription}>{type.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section id="collection-products" className={styles.section} aria-labelledby="collection-products-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="collection-products-title" className={styles.sectionTitle}>
                {catalogView.collectionTitle}
              </h2>
              <p className={styles.sectionIntro}>{catalogView.collectionIntro}</p>
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
                  simpleActions
                  showFavoriteButton={false}
                  showPartnerBadge={false}
                  persistPreferredSizeOnClick
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>{catalogView.emptyTitle}</strong>
              <p>{catalogView.emptyText}</p>
              <Link href={allFlowerTypeHref} className={styles.sectionLink}>
                {flowerTypeLabels.browseAll}
              </Link>
            </div>
          )}
        </section>

        {addOns.length > 0 ? (
          <section className={styles.section} aria-labelledby="collection-add-ons-title">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="collection-add-ons-title" className={styles.sectionTitle}>
                  {hubCopy.addOnsTitle}
                </h2>
                <p className={styles.sectionIntro}>{hubCopy.addOnsIntro}</p>
              </div>
              <Link href={addOnsHref} className={styles.sectionLink}>
                {locale === 'th' ? 'ดูของเสริมทั้งหมด' : 'View all add-ons'}
              </Link>
            </div>
            <div className={styles.addOnGrid}>
              {addOns.map((product) => (
                <ProductCard key={`${product.catalogKind}-${product.id}`} product={product} lang={locale} simpleActions />
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section} aria-label={locale === 'th' ? 'จุดเด่นบริการ' : 'Service highlights'}>
          <div className={styles.trustBand}>
            {hubCopy.trustItems.map((item, index) => (
              <div key={item.title} className={styles.trustItem}>
                <span className={styles.trustIcon} aria-hidden>
                  {TRUST_ICONS[index % TRUST_ICONS.length]}
                </span>
                <div>
                  <p className={styles.trustTitle}>{item.title}</p>
                  <p className={styles.trustText}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.infoGrid}`} aria-label={locale === 'th' ? 'ข้อมูลเพิ่มเติม' : 'Additional information'}>
          <div className={styles.deliveryCard}>
            <h2>{hubCopy.deliveryTitle}</h2>
            <p>{hubCopy.deliveryText}</p>
          </div>
          <div className={styles.linksCard}>
            <h2>{locale === 'th' ? 'เลือกซื้อเพิ่มเติม' : 'Helpful links'}</h2>
            <div className={styles.internalLinks}>
              <Link href={catalogHref}>{catalogView.collectionTitle}</Link>
              <Link href={allFlowerTypeHref}>{flowerTypeLabels.allInCatalog}</Link>
              {hub.flowerType === 'rose' ? (
                <Link href={`/${locale}/info/51-roses-chiang-mai`}>
                  {locale === 'th' ? 'ช่อกุหลาบ 51 ดอก' : '51 roses bouquets'}
                </Link>
              ) : null}
              <Link href={`/${locale}/contact`}>{locale === 'th' ? 'ติดต่อเรา' : 'Contact us'}</Link>
            </div>
          </div>
        </section>

        <GuideFaq faq={hubCopy.faq} title={hubCopy.faqTitle} />
      </div>
    </main>
  );
}
