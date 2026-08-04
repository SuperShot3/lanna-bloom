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

export function getProvinceStatusLabel(status: ProvinceStatus | string | null | undefined): string {
  switch (status) {
    case 'same_day':
      return 'Same-Day';
    case 'next_day':
      return 'Next-Day';
    case 'preorder_only':
      return 'Pre-order Only';
    case 'temporarily_unavailable':
      return 'Temporarily Unavailable';
    case 'coming_soon':
      return 'Coming Soon';
    default:
      return 'Unknown';
  }
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
