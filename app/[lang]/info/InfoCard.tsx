'use client';

import Link from 'next/link';
import type { ArticleMeta } from './_data/articles';
import { getArticleTitle, getArticleExcerpt } from './_data/articles';
import { ShareButton } from '@/components/ShareButton';

export function InfoCard({
  article,
  lang,
  basePath,
  baseUrl,
}: {
  article: ArticleMeta;
  lang: string;
  basePath: string;
  baseUrl: string;
}) {
  const href = `${basePath}/${article.slug}`;
  const fullUrl = `${baseUrl}${href}`;
  const title = getArticleTitle(article, lang);
  const excerpt = getArticleExcerpt(article, lang);
  const readLabel = lang === 'th' ? 'อ่านต่อ →' : 'Read →';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const coverStyle =
    article.cover.type === 'gradient'
      ? { background: article.cover.gradientCss }
      : undefined;

  return (
    <article className="info-card">
      <Link href={href} className="info-card-link">
        <div className="info-card-cover" style={coverStyle}>
          {article.cover.type === 'gradient' && (
            <span className="info-card-cover-center" aria-hidden>
              {article.cover.center.kind === 'emoji'
                ? article.cover.center.value
                : article.cover.center.kind === 'text'
                  ? article.cover.center.value
                  : null}
            </span>
          )}
          {article.cover.type === 'image' && (
            <img
              src={article.cover.src}
              alt={article.cover.alt}
              className="info-card-cover-img"
            />
          )}
        </div>
        <div className="info-card-body">
          <time className="info-card-date" dateTime={article.publishedAt}>
            {formatDate(article.publishedAt)}
          </time>
          <h3 className="info-card-title">{title}</h3>
          <p className="info-card-excerpt">{excerpt}</p>
          <div className="info-card-footer">
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <ShareButton
                url={fullUrl}
                title={title}
                text={excerpt}
                ariaLabel="Share this guide"
                variant="compact"
              />
            </div>
            <span className="info-card-read">{readLabel}</span>
          </div>
        </div>
      </Link>
      <style jsx>{`
        .info-card {
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .info-card:hover {
          box-shadow: var(--shadow-hover);
          transform: translateY(-2px);
        }
        .info-card-link {
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .info-card-cover {
          aspect-ratio: 16 / 10;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: var(--radius) var(--radius) 0 0;
        }
        .info-card-cover-center {
          font-size: 3rem;
          line-height: 1;
        }
        .info-card-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .info-card-body {
          padding: 20px;
        }
        .info-card-date {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: block;
        }
        .info-card-title {
          font-family: var(--font-serif);
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0 0 8px;
          color: var(--text);
          line-height: 1.3;
        }
        .info-card-excerpt {
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0 0 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .info-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .info-card-read {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--accent);
        }
      `}</style>
    </article>
  );
}
