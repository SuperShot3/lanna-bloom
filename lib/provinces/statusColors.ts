import type { ProvinceStatus } from './types';

/** Shared status → fill color for map choropleth and admin badges. */
export function getProvinceStatusFillColor(status: ProvinceStatus | string | null | undefined): string {
  switch (status) {
    case 'same_day':
      return '#2F6F5E';
    case 'next_day':
      return '#4A90A4';
    case 'preorder_only':
      return '#C5A059';
    case 'temporarily_unavailable':
      return '#A65D57';
    case 'coming_soon':
    default:
      return '#C8C2B4';
  }
}

const STATUS_LABELS: Record<ProvinceStatus, { en: string; th: string }> = {
  same_day: { en: 'Same-Day', th: 'วันเดียวกัน' },
  next_day: { en: 'Next-Day', th: 'วันถัดไป' },
  preorder_only: { en: 'Pre-order Only', th: 'พรีออเดอร์เท่านั้น' },
  temporarily_unavailable: { en: 'Temporarily Unavailable', th: 'ชั่วคราวไม่พร้อม' },
  coming_soon: { en: 'Coming Soon', th: 'เร็วๆ นี้' },
};

/** English label (map legend / admin). Prefer getProvinceStatusLabelLocalized for storefront. */
export function getProvinceStatusLabel(status: ProvinceStatus | string | null | undefined): string {
  return getProvinceStatusLabelLocalized(status, 'en');
}

export function getProvinceStatusLabelLocalized(
  status: ProvinceStatus | string | null | undefined,
  lang: 'en' | 'th'
): string {
  if (status && status in STATUS_LABELS) {
    const labels = STATUS_LABELS[status as ProvinceStatus];
    return lang === 'th' ? labels.th : labels.en;
  }
  return lang === 'th' ? 'ไม่ทราบ' : 'Unknown';
}

export const PROVINCE_STATUS_LEGEND: { status: ProvinceStatus; label: string; color: string }[] = [
  { status: 'same_day', label: 'Same-Day', color: getProvinceStatusFillColor('same_day') },
  { status: 'next_day', label: 'Next-Day', color: getProvinceStatusFillColor('next_day') },
  { status: 'preorder_only', label: 'Pre-order Only', color: getProvinceStatusFillColor('preorder_only') },
  {
    status: 'temporarily_unavailable',
    label: 'Temporarily Unavailable',
    color: getProvinceStatusFillColor('temporarily_unavailable'),
  },
  { status: 'coming_soon', label: 'Coming Soon', color: getProvinceStatusFillColor('coming_soon') },
];
