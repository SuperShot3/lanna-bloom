import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { getArticleBySlug, getArticleTitle, getArticleExcerpt, getArticleCtaLinks } from '../_data/articles';
import { ShareButton } from '@/components/ShareButton';
import { ArticleCta } from './ArticleCta';
import { ArticleListenPlayer } from './ArticleListenPlayer';
import { CatalogProductCard } from './CatalogProductCard';
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
  return {
    title: `${title} | Lanna Bloom`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Lanna Bloom`,
      description,
      url: canonical,
      type: 'article',
      publishedTime: article.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Lanna Bloom`,
      description,
    },
  };
}

export function generateStaticParams() {
  const slugs = [
    'gift-card-ideas-with-flowers',
    'plush-toys-teddy-bears-chiang-mai',
    'birthday-flower-gift-guide',
    'order-flowers-website-vs-facebook-chiang-mai',
    'birthday-flowers-chiang-mai-from-abroad',
    'rose-bouquets-chiang-mai',
    '51-roses-chiang-mai',
    'same-day-flower-delivery-chiang-mai',
    'flower-delivery-to-hotels-chiang-mai',
    'flowers-for-men',
    'flower-delivery-to-hospitals-chiang-mai',
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
  if (article.externalPath) {
    redirect(`/${lang}${article.externalPath}`);
  }
  const mdxSource = await getMdxContent(slug, lang);
  if (!mdxSource) notFound();

  const articleTitle = getArticleTitle(article, lang);
  const articleExcerpt = getArticleExcerpt(article, lang);
  const ctaLinks = getArticleCtaLinks(article, lang);
  const guidesBackLabel = lang === 'th' ? '← คู่มือ' : '← Guides';

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

  const mdxComponents = {
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
    }: {
      src: string;
      alt: string;
      caption?: string;
    }) => (
      <figure className={styles.articleFigure}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={styles.articleFigureImg} loading="lazy" />
        {caption ? (
          <figcaption className={styles.articleFigureCaption}>{caption}</figcaption>
        ) : null}
      </figure>
    ),
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
    <div className={styles.infoArticlePage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className={styles.infoArticle}>
        <header className={styles.infoArticleHeader}>
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
          <div className={styles.infoArticleMdx}>
            <MDXRemote source={mdxSource} components={mdxComponents} />
          </div>
          <ArticleCta links={ctaLinks} lang={lang} />
        </div>
      </article>
    </div>
  );
}
