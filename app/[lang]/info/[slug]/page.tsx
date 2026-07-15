import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBaseUrl } from '@/lib/orders';
import { getLineContactUrl } from '@/lib/messenger';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { getArticleBySlug, getArticleTitle, getArticleExcerpt, getArticleCtaLinks } from '../_data/articles';
import { isCommercialIntentSlug } from '@/lib/landingPages/intentLandingPages';
import { ShareButton } from '@/components/ShareButton';
import { ArticleCta } from './ArticleCta';
import { ArticleListenPlayer } from './ArticleListenPlayer';
import { CatalogProductCard } from './CatalogProductCard';
import { GuideComments } from '../_components/GuideComments';
import { IntentLandingPage } from '../_components/IntentLandingPage';
import { IntentStickyBar } from '../_components/IntentStickyBar';
import { RelatedGuides } from '../_components/RelatedGuides';
import { WeekdayClusterNav } from '../_components/WeekdayClusterNav';
import { infoArticleTableMdxComponents } from '@/lib/info/infoArticleTableMdxComponents';
import { infoArticleMdxOptions } from '@/lib/info/mdxRemoteOptions';
import { isThaiWeekdayClusterArticle } from '@/lib/info/weekdayCluster';
import styles from './article.module.css';

/** Public static URL; file must live under /public */
const ORDER_FROM_ABROAD_AUDIO = '/content/voice/order_flowers_from_abroad.mp3';

export const revalidate = 3600;

const CONTENT_DIR = path.join(process.cwd(), 'content', 'info');

/**
 * Load MDX content for an article. Tries [slug].[lang].mdx first (e.g. how-to-order-flower-delivery-chiang-mai.th.mdx),
 * then falls back to [slug].mdx for articles not yet migrated to locale-specific files.
 */
async function getMdxContent(slug: string, lang: string): Promise<string | null> {
  const localeFile = path.join(CONTENT_DIR, `${slug}.${lang}.mdx`);
  const fallbackFile = path.join(CONTENT_DIR, `${slug}.mdx`);
  try {
    const content = await fs.readFile(localeFile, 'utf-8');
    return content;
  } catch {
    try {
      const content = await fs.readFile(fallbackFile, 'utf-8');
      return content;
    } catch {
      return null;
    }
  }
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  const { lang, slug } = params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const article = getArticleBySlug(slug);
  if (!article) return { title: 'Lanna Bloom' };
  const base = getBaseUrl();
  const canonical = article.externalPath
    ? `${base}/${lang}${article.externalPath}`
    : `${base}/${lang}/info/${slug}`;
  const title = getArticleTitle(article, lang);
  const description = getArticleExcerpt(article, lang);
  const coverImage =
    article.cover?.type === 'image' ? `${base}${article.cover.src}` : undefined;
  return {
    title: `${title} | Lanna Bloom`,
    description,
    ...(article.noindex ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical },
    openGraph: {
      title: `${title} | Lanna Bloom`,
      description,
      url: canonical,
      type: 'article',
      publishedTime: article.publishedAt,
      ...(coverImage ? { images: [{ url: coverImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Lanna Bloom`,
      description,
      ...(coverImage ? { images: [coverImage] } : {}),
    },
  };
}

export function generateStaticParams() {
  const slugs = [
    'gift-card-ideas-with-flowers',
    'thai-breakfast-chiang-mai',
    'plush-toys-teddy-bears-chiang-mai',
    'birthday-flower-gift-guide',
    'order-flowers-website-vs-facebook-chiang-mai',
    'birthday-flowers-chiang-mai-from-abroad',
    'rose-bouquets-chiang-mai',
    '51-roses-chiang-mai',
    'same-day-flower-delivery-chiang-mai',
    'flower-delivery-to-hotels-chiang-mai',
    'monday-flowers-thailand-yellow-bouquets',
    'flowers-by-day-of-week-thailand',
    'tuesday-flowers-thailand',
    'wednesday-flowers-thailand',
    'thursday-flowers-thailand',
    'friday-flowers-thailand',
    'saturday-flowers-thailand',
    'sunday-flowers-thailand',
    'flowers-for-men',
    'flower-delivery-to-hospitals-chiang-mai',
    'buy-flowers-online-chiang-mai-thailand',
    'delivery-policy',
  ];
  const params: { lang: string; slug: string }[] = [];
  for (const lang of locales) {
    for (const slug of slugs) {
      params.push({ lang, slug });
    }
  }
  return params;
}

export default async function InfoArticlePage({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  const { lang, slug } = params;
  if (!isValidLocale(lang)) notFound();
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  if (article.externalPath !== undefined) {
    const suffix = article.externalPath.replace(/\/$/, '');
    permanentRedirect(suffix ? `/${lang}${suffix}` : `/${lang}`);
  }
  const mdxSource = await getMdxContent(slug, lang);
  if (!mdxSource) notFound();

  if (isCommercialIntentSlug(slug)) {
    return (
      <IntentLandingPage
        article={article}
        mdxSource={mdxSource}
        lang={lang as Locale}
      />
    );
  }

  const articleTitle = getArticleTitle(article, lang);
  const articleExcerpt = getArticleExcerpt(article, lang);
  const ctaLinks = getArticleCtaLinks(article, lang);
  const ctaTitle = lang === 'th' ? article.ctaTitleTh ?? article.ctaTitle : article.ctaTitle;
  const guidesBackLabel = lang === 'th' ? '← คู่มือ' : '← Guides';
  const showWeekdayClusterNav = isThaiWeekdayClusterArticle(slug);

  const base = getBaseUrl();
  const basePath = `/${lang}/info`;
  const articleUrl = `${base}${basePath}/${slug}`;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: articleTitle,
    description: articleExcerpt,
    datePublished: article.publishedAt,
    url: articleUrl,
    publisher: {
      '@type': 'Organization',
      name: 'Lanna Bloom',
    },
  };

  const catalogCardVariant =
    slug === '51-roses-chiang-mai' || slug === 'flower-delivery-to-hotels-chiang-mai'
      ? 'article-catalog-button'
      : 'default';

  const showPayCta = slug === 'tuesday-flowers-thailand';
  const stickyPayHref = `/${lang}/catalog?colors=pink`;
  const stickyPayLabel =
    lang === 'th' ? 'สั่งและชำระออนไลน์' : 'Order & pay online';

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
    blockquote: (props: React.HTMLAttributes<HTMLElement>) => (
      <blockquote className="info-article-callout" {...props} />
    ),
    hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
      <hr className="info-article-divider" {...props} />
    ),
    em: (props: React.HTMLAttributes<HTMLElement>) => (
      <em className="info-article-em" {...props} />
    ),
    strong: (props: React.HTMLAttributes<HTMLElement>) => (
      <strong className="info-article-strong" {...props} />
    ),
    ArticleListen: () => (
      <ArticleListenPlayer src={ORDER_FROM_ABROAD_AUDIO} lang={lang} />
    ),
    CatalogProductCard: ({ slug: productSlug }: { slug: string }) => (
      <CatalogProductCard
        slug={productSlug}
        lang={lang as Locale}
        variant={catalogCardVariant}
      />
    ),
    CatalogProductCardGrid: ({ children }: { children: React.ReactNode }) => (
      <div className={styles.inlineCatalogCardGrid}>{children}</div>
    ),
    ArticleFigure: ({
      src,
      alt,
      caption,
      href,
      linkLabel,
      size = 'md',
    }: {
      src: string;
      alt: string;
      caption?: string;
      /** Site path (e.g. /catalog?colors=pink) or "line" for LINE contact */
      href?: string;
      linkLabel?: string;
      size?: 'sm' | 'md';
    }) => {
      const isLine = href === 'line';
      const resolvedHref = isLine
        ? getLineContactUrl()
        : href
          ? href.startsWith('http')
            ? href
            : `/${lang}${href.startsWith('/') ? href : `/${href}`}`
          : undefined;
      const figureClass =
        size === 'sm'
          ? `${styles.articleFigure} ${styles.articleFigureSm}`
          : styles.articleFigure;

      return (
        <figure className={figureClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className={styles.articleFigureImg} loading="lazy" />
          {caption ? (
            <figcaption className={styles.articleFigureCaption}>{caption}</figcaption>
          ) : null}
          {resolvedHref && linkLabel ? (
            <p className={styles.articleFigureCta}>
              {isLine || resolvedHref.startsWith('http') ? (
                <a
                  href={resolvedHref}
                  className={styles.articleFigureCtaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkLabel}
                </a>
              ) : (
                <Link href={resolvedHref} className={styles.articleFigureCtaLink}>
                  {linkLabel}
                </Link>
              )}
            </p>
          ) : null}
        </figure>
      );
    },
    ArticleProductPick: ({
      title,
      children,
    }: {
      title?: string;
      children: React.ReactNode;
    }) => (
      <aside className={styles.articleProductPick} aria-label={title ?? 'Recommended bouquet'}>
        {title ? <p className={styles.articleProductPickTitle}>{title}</p> : null}
        <div className={styles.articleProductPickBody}>{children}</div>
      </aside>
    ),
    ArticleChecklistBlock: ({
      title,
      variant = 'default',
      children,
    }: {
      title: string;
      variant?: 'essential' | 'recommended' | 'tip' | 'default';
      children: React.ReactNode;
    }) => (
      <section
        className={styles.articleChecklistBlock}
        data-variant={variant}
        aria-label={title}
      >
        <div className={styles.articleChecklistBlockHeader}>
          <span className={styles.articleChecklistBlockBadge} aria-hidden />
          <p className={styles.articleChecklistBlockTitle}>{title}</p>
        </div>
        <div className={styles.articleChecklistBlockBody}>{children}</div>
      </section>
    ),
    ArticleStepsBlock: ({ children }: { children: React.ReactNode }) => (
      <div className={styles.articleStepsBlock}>
        <div className={styles.articleStepsBody}>{children}</div>
      </div>
    ),
  };

  return (
    <div
      className={`${styles.infoArticlePage}${showPayCta ? ` ${styles.infoArticlePageWithStickyPay}` : ''}`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className={styles.infoArticle}>
        <header
          className={styles.infoArticleHeader}
          id={showPayCta ? 'intent-hero-sentinel' : undefined}
        >
          <Link href={basePath} className={styles.infoArticleBack}>
            {guidesBackLabel}
          </Link>
          <time
            className={styles.infoArticleDate}
            dateTime={article.publishedAt}
          >
            {formatDate(article.publishedAt)}
          </time>
          <h1 className={styles.infoArticleTitle}>{articleTitle}</h1>
          <p className={styles.infoArticleSubtitle}>{articleExcerpt}</p>
          <div className={styles.infoArticleShare}>
            <ShareButton
              url={articleUrl}
              title={articleTitle}
              text={articleExcerpt}
              showFacebook
              ariaLabel="Share this guide"
            />
          </div>
        </header>
        <div className={styles.infoArticleBody}>
          {showWeekdayClusterNav ? (
            <WeekdayClusterNav lang={lang} currentSlug={slug} />
          ) : null}
          <div className={styles.infoArticleMdx}>
            <MDXRemote
              source={mdxSource}
              components={mdxComponents}
              options={infoArticleMdxOptions}
            />
          </div>
          <ArticleCta
            links={ctaLinks}
            lang={lang}
            title={ctaTitle}
            showPaymentBadges={showPayCta}
          />
          <RelatedGuides excludeSlug={slug} lang={lang} />
          <GuideComments guideSlug={slug} lang={lang} />
        </div>
      </article>
      {showPayCta ? (
        <IntentStickyBar
          label={stickyPayLabel}
          href={stickyPayHref}
          intentSlug={slug}
        />
      ) : null}
    </div>
  );
}
