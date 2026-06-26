import 'server-only';

import type { AdsMetricRow } from './types';

export function microsToThb(micros: number | string | undefined | null): number {
  const n = Number(micros ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n / 1_000_000;
}

export function computeCpa(spend: number, conversions: number): number | null {
  if (conversions <= 0) return null;
  return spend / conversions;
}

export function computeRoas(conversionValue: number, spend: number): number | null {
  if (spend <= 0) return null;
  return conversionValue / spend;
}

export function computeCtr(clicks: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return clicks / impressions;
}

export function buildMetricRow(input: {
  id: string;
  name: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionValue: number;
  campaignId?: string;
  campaignName?: string;
  adGroupId?: string;
  adGroupName?: string;
  landingPage?: string;
  matchType?: string;
}): AdsMetricRow {
  const { spend, clicks, impressions, conversions, conversionValue } = input;
  return {
    ...input,
    ctr: computeCtr(clicks, impressions),
    averageCpc: clicks > 0 ? spend / clicks : 0,
    cpa: computeCpa(spend, conversions),
    roas: computeRoas(conversionValue, spend),
  };
}

export function aggregateMetrics(rows: AdsMetricRow[]): AdsMetricRow {
  const totals = rows.reduce(
    (acc, row) => {
      acc.spend += row.spend;
      acc.clicks += row.clicks;
      acc.impressions += row.impressions;
      acc.conversions += row.conversions;
      acc.conversionValue += row.conversionValue;
      return acc;
    },
    { spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionValue: 0 },
  );
  return buildMetricRow({
    id: 'summary',
    name: 'All campaigns',
    ...totals,
  });
}

export function formatGaqlDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolveDateRange(days: number): { dateFrom: string; dateTo: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - Math.max(1, days - 1));
  return { dateFrom: formatGaqlDate(start), dateTo: formatGaqlDate(end) };
}
