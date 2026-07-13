import Link from 'next/link';
import {
  THAI_WEEKDAY_DAYS,
  THAI_WEEKDAY_PILLAR_SLUG,
} from '@/lib/info/weekdayCluster';
import styles from '../[slug]/article.module.css';

export function WeekdayClusterNav({
  lang,
  currentSlug,
}: {
  lang: string;
  currentSlug: string;
}) {
  const basePath = `/${lang}/info`;
  const isPillar = currentSlug === THAI_WEEKDAY_PILLAR_SLUG;

  const t =
    lang === 'th'
      ? {
          label: 'ชุดบทความดอกไม้ตามวันเกิด',
          pillar: 'ภาพรวม',
        }
      : {
          label: 'Thai weekday flower guides',
          pillar: 'Overview',
        };

  return (
    <nav className={styles.weekdayClusterNav} aria-label={t.label}>
      <p className={styles.weekdayClusterNavLabel}>{t.label}</p>
      <ul className={styles.weekdayClusterNavList}>
        <li>
          <Link
            href={`${basePath}/${THAI_WEEKDAY_PILLAR_SLUG}`}
            className={styles.weekdayClusterNavLink}
            data-active={isPillar ? 'true' : undefined}
            aria-current={isPillar ? 'page' : undefined}
          >
            {t.pillar}
          </Link>
        </li>
        {THAI_WEEKDAY_DAYS.map((day) => {
          const isActive = currentSlug === day.slug;
          const dayLabel = lang === 'th' ? day.labelTh : day.labelEn;
          return (
            <li key={day.slug}>
              <Link
                href={`${basePath}/${day.slug}`}
                className={styles.weekdayClusterNavLink}
                data-active={isActive ? 'true' : undefined}
                aria-current={isActive ? 'page' : undefined}
                style={{ '--day-color': day.color } as React.CSSProperties}
              >
                <span className={styles.weekdayClusterNavDot} aria-hidden />
                {dayLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
