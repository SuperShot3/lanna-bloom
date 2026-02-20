import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getArticleBySlug, getArticleTitle, getArticleExcerpt, getArticleCtaLinks } from '../_data/articles';
import { ShareButton } from '@/components/ShareButton';
import { ArticleCta } from './ArticleCta';
import styles from './article.module.css';

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
  const canonical = `${base}/${lang}/info/${slug}`;
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
    'how-to-order-flower-delivery-chiang-mai',
    'rose-bouquets-chiang-mai',
    'same-day-flower-delivery-chiang-mai',
    'flower-delivery-to-hospitals-chiang-mai',
    'delivery-policy-chiang-mai',
  ];
  const params: { lang: string; slug: string }[] = [];
  for (const lang of ['en', 'th']) {
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
    li: (props: React.HTMLAttributes<HTMLLIElement>) => (
      <li className="info-article-li" {...props} />
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
          <MDXRemote source={mdxSource} components={mdxComponents} />
          <ArticleCta links={ctaLinks} lang={lang} />
        </div>
      </article>
    </div>
  );
}
