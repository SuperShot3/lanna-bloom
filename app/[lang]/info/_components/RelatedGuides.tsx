import Link from 'next/link';
import {
  getArticlePath,
  getArticleTitle,
  getRelatedGuides,
} from '../_data/articles';
import styles from '../[slug]/article.module.css';

export function RelatedGuides({
  excludeSlug,
  lang,
}: {
  excludeSlug: string;
  lang: string;
}) {
  const related = getRelatedGuides(excludeSlug, 3);
  if (related.length === 0) return null;

  const title = lang === 'th' ? 'คู่มือที่เกี่ยวข้อง' : 'Related guides';

  return (
    <section
      className={styles.infoRelatedGuides}
      aria-labelledby="related-guides-title"
    >
      <h2 id="related-guides-title" className={styles.infoArticleCtaTitle}>
        {title}
      </h2>
      <ul className={styles.infoRelatedGuidesList}>
        {related.map((article) => (
          <li key={article.slug}>
            <Link
              href={getArticlePath(article, lang)}
              className={styles.infoRelatedGuidesLink}
            >
              {getArticleTitle(article, lang)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
