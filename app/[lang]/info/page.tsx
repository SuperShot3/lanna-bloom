import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import {
  getFeaturedArticle,
  getMoreGuides,
  getArticleTitle,
  getArticleExcerpt,
} from './_data/articles';
import { InfoCard } from './InfoCard';
import { ShareButton } from '@/components/ShareButton';
import styles from './info.module.css';

export const revalidate = 3600;

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
      ? 'Guides & Info | Lanna Bloom'
      : 'คู่มือและข้อมูล | Lanna Bloom';
  const description =
    locale === 'en'
      ? 'Flower delivery guides, same-day delivery info, and tips for ordering bouquets in Chiang Mai.'
      : 'คู่มือการจัดส่งดอกไม้ ข้อมูลจัดส่งวันเดียว และเคล็ดลับการสั่งช่อดอกไม้ในเชียงใหม่';
  const base = getBaseUrl();
  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${lang}/info`,
    },
  };
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'th' }];
}

export default async function InfoHubPage({
  params,
}: {
  params: { lang: string };
}) {
  const { lang } = params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;
  const base = getBaseUrl();
  const basePath = `/${lang}/info`;
  const featured = getFeaturedArticle();
  const moreGuides = getMoreGuides(featured.slug);
  const featuredUrl = `${base}${basePath}/${featured.slug}`;
  const featuredTitle = getArticleTitle(featured, lang);
  const featuredExcerpt = getArticleExcerpt(featured, lang);

  const t =
    locale === 'en'
      ? { readMore: 'Read more', moreGuides: 'More guides' }
      : { readMore: 'อ่านต่อ', moreGuides: 'คู่มืออื่นๆ' };

  const featuredCoverStyle =
    featured.cover.type === 'gradient'
      ? { background: featured.cover.gradientCss }
      : undefined;

  return (
    <div className={styles.infoPage}>
      <div className="container">
        {/* Featured section */}
        <section className={styles.infoFeatured} aria-labelledby="info-featured-title">
          <div className={styles.infoFeaturedContent}>
            <h1 id="info-featured-title" className={styles.infoFeaturedTitle}>
              {featuredTitle}
            </h1>
            <p className={styles.infoFeaturedExcerpt}>{featuredExcerpt}</p>
            <div className={styles.infoFeaturedActions}>
              <Link href={`${basePath}/${featured.slug}`} className={styles.infoCta}>
                {t.readMore}
              </Link>
              <ShareButton
                url={featuredUrl}
                title={featuredTitle}
                text={featuredExcerpt}
                ariaLabel="Share this guide"
              />
            </div>
          </div>
          <Link
            href={`${basePath}/${featured.slug}`}
            className={styles.infoFeaturedCard}
          >
            <div
              className={styles.infoFeaturedCover}
              style={featuredCoverStyle}
            >
              {featured.cover.type === 'gradient' && (
                <span className={styles.infoFeaturedCoverCenter} aria-hidden>
                  {featured.cover.center.value}
                </span>
              )}
            </div>
          </Link>
        </section>

        {/* More guides grid */}
        <section className={styles.infoMore} aria-labelledby="info-more-title">
          <h2 id="info-more-title" className={styles.infoMoreTitle}>
            {t.moreGuides}
          </h2>
          <div className={styles.infoGrid}>
            {moreGuides.map((article) => (
              <InfoCard
                key={article.slug}
                article={article}
                lang={lang}
                basePath={basePath}
                baseUrl={base}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
