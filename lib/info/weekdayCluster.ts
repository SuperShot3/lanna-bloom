/**
 * Thai weekday flower article cluster — pillar + seven day guides.
 * Used to group cards on the info hub and show in-article navigation.
 */

export const THAI_WEEKDAY_PILLAR_SLUG = 'flowers-by-day-of-week-thailand';

export type WeekdayClusterDay = {
  slug: string;
  labelEn: string;
  labelTh: string;
  color: string;
};

/** Sunday-first order to match the pillar article table. */
export const THAI_WEEKDAY_DAYS: WeekdayClusterDay[] = [
  {
    slug: 'sunday-flowers-thailand',
    labelEn: 'Sunday',
    labelTh: 'อาทิตย์',
    color: '#dc2626',
  },
  {
    slug: 'monday-flowers-thailand-yellow-bouquets',
    labelEn: 'Monday',
    labelTh: 'จันทร์',
    color: '#ca8a04',
  },
  {
    slug: 'tuesday-flowers-thailand',
    labelEn: 'Tuesday',
    labelTh: 'อังคาร',
    color: '#ec4899',
  },
  {
    slug: 'wednesday-flowers-thailand',
    labelEn: 'Wednesday',
    labelTh: 'พุธ',
    color: '#16a34a',
  },
  {
    slug: 'thursday-flowers-thailand',
    labelEn: 'Thursday',
    labelTh: 'พฤหัสบดี',
    color: '#ea580c',
  },
  {
    slug: 'friday-flowers-thailand',
    labelEn: 'Friday',
    labelTh: 'ศุกร์',
    color: '#2563eb',
  },
  {
    slug: 'saturday-flowers-thailand',
    labelEn: 'Saturday',
    labelTh: 'เสาร์',
    color: '#7c3aed',
  },
];

export const THAI_WEEKDAY_CLUSTER_SLUGS: string[] = [
  THAI_WEEKDAY_PILLAR_SLUG,
  ...THAI_WEEKDAY_DAYS.map((d) => d.slug),
];

export function isThaiWeekdayClusterArticle(slug: string): boolean {
  return THAI_WEEKDAY_CLUSTER_SLUGS.includes(slug);
}

export function getWeekdayClusterDay(slug: string): WeekdayClusterDay | undefined {
  return THAI_WEEKDAY_DAYS.find((d) => d.slug === slug);
}
