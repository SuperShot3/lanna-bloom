import Link from 'next/link';
import type { ArticleCtaLink } from '../_data/articles';
import styles from './article.module.css';

export function ArticleCta({
  links,
  lang,
}: {
  links: ArticleCtaLink[];
  lang: string;
}) {
  return (
    <section className={styles.infoArticleCta} aria-labelledby="info-article-cta-title">
      <h2 id="info-article-cta-title" className={styles.infoArticleCtaTitle}>
        {lang === 'th' ? 'สั่งซื้อหรือเลือกช่อ' : 'Order or browse'}
      </h2>
      <div className={styles.infoArticleCtaLinks}>
        {links.map((link, i) => {
          const label = lang === 'th' ? link.labelTh : link.label;
          const href = `/${lang}${link.href}`;
          const isPrimary = i === 0;
          return (
            <Link
              key={link.href + link.label}
              href={href}
              className={`${styles.infoArticleCtaLink} ${!isPrimary ? styles.infoArticleCtaLinkSecondary : ''}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
