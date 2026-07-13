import Link from 'next/link';
import {
  getArticleBySlug,
  getArticleExcerpt,
  getArticleTitle,
} from './_data/articles';
import {
  THAI_WEEKDAY_DAYS,
  THAI_WEEKDAY_PILLAR_SLUG,
} from '@/lib/info/weekdayCluster';
import styles from './info.module.css';

export function WeekdayClusterHub({
  lang,
  basePath,
}: {
  lang: string;
  basePath: string;
}) {
  const pillar = getArticleBySlug(THAI_WEEKDAY_PILLAR_SLUG);
  if (!pillar) return null;

  const pillarHref = `${basePath}/${THAI_WEEKDAY_PILLAR_SLUG}`;
  const title = getArticleTitle(pillar, lang);
  const excerpt = getArticleExcerpt(pillar, lang);

  const t =
    lang === 'th'
      ? {
          series: 'ชุดบทความ',
          readGuide: 'อ่านคู่มือฉบับเต็ม →',
          dayGuides: 'เลือกตามวันเกิด',
        }
      : {
          series: 'Article series',
          readGuide: 'Read the full guide →',
          dayGuides: 'Browse by birth day',
        };

  return (
    <section
      className={styles.weekdayCluster}
      aria-labelledby="weekday-cluster-title"
    >
      <div className={styles.weekdayClusterInner}>
        <div className={styles.weekdayClusterRainbow} aria-hidden />
        <div className={styles.weekdayClusterContent}>
          <p className={styles.weekdayClusterEyebrow}>{t.series}</p>
          <h3 className={styles.weekdayClusterTitle}>
            <Link href={pillarHref} className={styles.weekdayClusterTitleLink}>
              {title}
            </Link>
          </h3>
          <p className={styles.weekdayClusterExcerpt}>{excerpt}</p>

          <p className={styles.weekdayClusterDayLabel}>{t.dayGuides}</p>
          <ul className={styles.weekdayClusterDays}>
            {THAI_WEEKDAY_DAYS.map((day) => {
              const dayLabel = lang === 'th' ? day.labelTh : day.labelEn;
              return (
                <li key={day.slug}>
                  <Link
                    href={`${basePath}/${day.slug}`}
                    className={styles.weekdayClusterDayLink}
                    style={{ '--day-color': day.color } as React.CSSProperties}
                  >
                    <span className={styles.weekdayClusterDayDot} aria-hidden />
                    <span className={styles.weekdayClusterDayName}>{dayLabel}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className={styles.weekdayClusterCta}>
            <Link href={pillarHref} className={styles.weekdayClusterCtaLink}>
              {t.readGuide}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
