import Image from 'next/image';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { BouquetCard } from '@/components/BouquetCard';
import { GoogleReviewsBadge } from '@/components/GoogleReviewsBadge';
import { MessengerOrderButtons } from '@/components/MessengerOrderButtons';
import { PaymentBadges } from '@/components/PaymentBadges';
import { TrustBadges } from '@/components/TrustBadges';
import { getBaseUrl } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import {
  getIntentLanding,
  localize,
  localizeFaq,
  type IntentLandingConfig,
} from '@/lib/landingPages/intentLandingPages';
import {
  getBouquetBySlugFromSanity,
  getPopularBouquetsFromSanity,
} from '@/lib/sanity';
import type { Bouquet } from '@/lib/bouquets';
import { infoArticleTableMdxComponents } from '@/lib/info/infoArticleTableMdxComponents';
import { infoArticleMdxOptions } from '@/lib/info/mdxRemoteOptions';
import {
  getArticleBySlug,
  getArticlePath,
  getArticleTitle,
  type ArticleMeta,
} from '../_data/articles';
import { GuideComments } from './GuideComments';
import { GuideFaq } from './GuideFaq';
import { IntentStickyBar } from './IntentStickyBar';
import { DeliveryDistrictMap } from '@/components/delivery/DeliveryDistrictMap';
import styles from './intent-landing.module.css';

async function loadIntentBouquets(
  config: IntentLandingConfig
): Promise<Bouquet[]> {
  const limit = config.catalogLimit ?? 12;
  const byId = new Map<string, Bouquet>();

  if (config.featuredSlugs?.length) {
    const featured = await Promise.all(
      config.featuredSlugs.map((slug) => getBouquetBySlugFromSanity(slug))
    );
    for (const b of featured) {
      if (b) byId.set(b.id, b);
    }
  }

  if (byId.size < limit) {
    const popular = await getPopularBouquetsFromSanity(limit + 8);
    for (const b of popular) {
      if (byId.size >= limit) break;
      if (!byId.has(b.id)) byId.set(b.id, b);
    }
  }

  return Array.from(byId.values()).slice(0, limit);
}

function IntentRelatedLinks({
  slugs,
  lang,
}: {
  slugs: string[];
  lang: string;
}) {
  const articles = slugs
    .map((slug) => getArticleBySlug(slug))
    .filter((a): a is ArticleMeta => Boolean(a));

  if (articles.length === 0) return null;

  const title = lang === 'th' ? 'หัวข้อที่เกี่ยวข้อง' : 'Related topics';

  return (
    <section className={styles.related} aria-labelledby="intent-related-title">
      <h2 id="intent-related-title" className={styles.relatedTitle}>
        {title}
      </h2>
      <ul className={styles.relatedList}>
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={getArticlePath(article, lang)}
              className={styles.relatedLink}
            >
              {getArticleTitle(article, lang)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function IntentLandingPage({
  article,
  mdxSource,
  lang,
}: {
  article: ArticleMeta;
  mdxSource: string;
  lang: Locale;
}) {
  const config = getIntentLanding(article.slug);
  if (!config) return null;

  const locale = lang;
  const h1 = getArticleTitle(article, lang);
  const directAnswer = localize(config.directAnswer, lang);
  const benefits = config.benefits.map((b) => localize(b, lang));
  const primaryCta = localize(config.primaryCta, lang);
  const catalogTitle = localize(config.catalogTitle, lang);
  const faqTitle = localize(config.faqTitle, lang);
  const seoMoreLabel = localize(config.seoMoreLabel, lang);
  const stickyLabel = localize(config.stickyCta, lang);
  const catalogHref = `/${lang}${config.primaryCtaHref ?? '/catalog'}`;
  const bouquets = await loadIntentBouquets(config);
  const faqItems = localizeFaq(config.faq, lang);
  const base = getBaseUrl();
  const pageUrl = `${base}${getArticlePath(article, lang)}`;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: h1,
    description: directAnswer,
    url: pageUrl,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.intent-speakable'],
    },
    publisher: {
      '@type': 'Organization',
      name: 'Lanna Bloom',
    },
  };

  const itemListJsonLd =
    bouquets.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: bouquets.map((b, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${base}/${lang}/catalog/${b.slug}`,
            name: locale === 'th' && b.nameTh ? b.nameTh : b.nameEn,
          })),
        }
      : null;

  const mdxComponents = {
    ...infoArticleTableMdxComponents,
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className="info-article-h2" {...props} />
    ),
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="info-article-h3" {...props} />
    ),
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="info-article-p" {...props} />
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="info-article-ul" {...props} />
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className="info-article-li" {...props}>
        <span className="info-article-li-text">{children}</span>
      </li>
    ),
    strong: (props: React.HTMLAttributes<HTMLElement>) => (
      <strong className="info-article-strong" {...props} />
    ),
    em: (props: React.HTMLAttributes<HTMLElement>) => (
      <em className="info-article-em" {...props} />
    ),
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a {...props} />
    ),
    // Suppress product embeds in SEO body — catalog is above
    CatalogProductCard: () => null,
    CatalogProductCardGrid: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    ArticleProductPick: () => null,
    ArticleFigure: () => null,
    ArticleStepsBlock: ({ children }: { children: React.ReactNode }) => (
      <div className="info-article-ul">{children}</div>
    ),
    ArticleChecklistBlock: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    ArticleListen: () => null,
  };

  const heroCopy = (
    <>
      {config.eyebrow ? (
        <p className={styles.eyebrow}>{localize(config.eyebrow, lang)}</p>
      ) : null}
      <h1 id="intent-h1" className={styles.h1}>
        {h1}
      </h1>
      <p className={`${styles.directAnswer} intent-speakable`}>{directAnswer}</p>
      {config.serviceHoursNote ? (
        <p className={styles.serviceHours}>
          {localize(config.serviceHoursNote, lang)}
        </p>
      ) : null}
      <ul className={styles.benefits}>
        {benefits.map((text) => (
          <li key={text} className={styles.benefitItem}>
            {text}
          </li>
        ))}
      </ul>
      <div className={styles.trustRow}>
        <GoogleReviewsBadge lang={locale} />
        <TrustBadges
          lang={locale}
          sameDayDelivery={config.showSameDayBadge !== false}
          securePayments
          realReviews={false}
          refundPolicy
        />
      </div>
      {config.showPaymentBadges ? (
        <div style={{ marginTop: 12, maxWidth: 280 }}>
          <PaymentBadges lang={locale} compact />
        </div>
      ) : null}
      <div className={styles.heroActions}>
        <Link href={catalogHref} className={styles.primaryCta}>
          {primaryCta}
        </Link>
        <MessengerOrderButtons
          lang={locale}
          contactOnly
          pageLocation="guide"
        />
      </div>
    </>
  );

  return (
    <div className={styles.page} data-intent-slug={article.slug}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {itemListJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      ) : null}

      <div className={styles.container}>
        <section
          className={`${styles.hero} ${
            config.heroVariant === 'split' ? styles.heroSplit : styles.heroCompact
          }`}
          aria-labelledby="intent-h1"
          id="intent-hero-sentinel"
        >
          {config.heroVariant === 'split' && config.heroImage ? (
            <>
              <div className={styles.heroCopy}>{heroCopy}</div>
              <div className={styles.heroVisual}>
                <Image
                  src={config.heroImage.src}
                  alt={localize(config.heroImage.alt, lang)}
                  width={720}
                  height={560}
                  className={styles.heroImage}
                  style={
                    config.heroImage.objectPosition
                      ? { objectPosition: config.heroImage.objectPosition }
                      : undefined
                  }
                  priority
                  sizes="(max-width: 800px) 100vw, 48vw"
                />
              </div>
            </>
          ) : (
            <div>{heroCopy}</div>
          )}
        </section>

        {bouquets.length > 0 ? (
          <section
            className={styles.catalogSection}
            aria-labelledby="intent-catalog-title"
          >
            <div className={styles.catalogHeader}>
              <h2 id="intent-catalog-title" className={styles.catalogTitle}>
                {catalogTitle}
              </h2>
              <Link href={catalogHref} className={styles.catalogViewAll}>
                {lang === 'th' ? 'ดูทั้งหมด →' : 'View all →'}
              </Link>
            </div>
            <div className="popular-grid">
              {bouquets.map((bouquet) => (
                <BouquetCard
                  key={bouquet.id}
                  bouquet={bouquet}
                  lang={locale}
                />
              ))}
            </div>
          </section>
        ) : null}

        {config.showDeliveryMap ? (
          <section className={styles.deliveryMapSection} aria-label={lang === 'th' ? 'แผนที่พื้นที่จัดส่ง' : 'Delivery area map'}>
            <DeliveryDistrictMap lang={locale} />
          </section>
        ) : null}

        <GuideFaq faq={faqItems} title={faqTitle} />

        <IntentRelatedLinks slugs={config.relatedIntents} lang={lang} />

        {config.seoBodyCollapsible !== false ? (
          <details className={styles.seoMore}>
            <summary className={styles.seoMoreSummary}>{seoMoreLabel}</summary>
            <div className={styles.seoMoreBody}>
              <MDXRemote
                source={mdxSource}
                components={mdxComponents}
                options={infoArticleMdxOptions}
              />
            </div>
          </details>
        ) : (
          <div className={styles.seoMoreBody}>
            <MDXRemote
              source={mdxSource}
              components={mdxComponents}
              options={infoArticleMdxOptions}
            />
          </div>
        )}

        <section className="guide-section">
          <GuideComments guideSlug={article.slug} lang={locale} />
        </section>
      </div>

      <IntentStickyBar
        label={stickyLabel}
        href={catalogHref}
        intentSlug={article.slug}
      />
    </div>
  );
}
