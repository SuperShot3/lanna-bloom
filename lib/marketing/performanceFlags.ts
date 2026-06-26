import 'server-only';

import type { AdsMetricRow, PerformanceFlag } from './types';
import { MARKETING_SAFETY } from './config';

interface FlagInput {
  campaigns: AdsMetricRow[];
  keywords: AdsMetricRow[];
  searchTerms: AdsMetricRow[];
  landingPages: AdsMetricRow[];
}

export function buildPerformanceFlags(input: FlagInput): PerformanceFlag[] {
  const flags: PerformanceFlag[] = [];

  for (const c of input.campaigns) {
    if (
      c.spend >= MARKETING_SAFETY.minSpendThbForKeywordAction &&
      c.conversions === 0 &&
      c.clicks >= MARKETING_SAFETY.minClicksForKeywordAction
    ) {
      flags.push({
        code: 'high_spend_no_conversions',
        severity: 'warning',
        title: 'High spend, no purchases',
        detail: `${c.name} spent ${c.spend.toFixed(0)} THB with ${c.clicks} clicks and 0 conversions.`,
        entityType: 'campaign',
        entityId: c.id,
        entityName: c.name,
      });
    }
    if (c.roas != null && c.roas >= 3 && c.spend < 500) {
      flags.push({
        code: 'good_roas_limited_spend',
        severity: 'info',
        title: 'Strong ROAS with limited spend',
        detail: `${c.name} has ROAS ${c.roas.toFixed(1)}x on ${c.spend.toFixed(0)} THB spend — may deserve more budget.`,
        entityType: 'campaign',
        entityId: c.id,
        entityName: c.name,
      });
    }
  }

  for (const k of input.keywords) {
    if (
      k.clicks >= MARKETING_SAFETY.minClicksForKeywordAction &&
      k.conversions === 0 &&
      k.spend >= MARKETING_SAFETY.minSpendThbForNegativeKeyword
    ) {
      flags.push({
        code: 'keyword_clicks_no_conversions',
        severity: 'warning',
        title: 'Keyword clicks without conversions',
        detail: `"${k.name}" in ${k.campaignName ?? 'campaign'} — ${k.clicks} clicks, ${k.spend.toFixed(0)} THB, 0 conversions.`,
        entityType: 'keyword',
        entityId: k.id,
        entityName: k.name,
      });
    }
  }

  for (const st of input.searchTerms) {
    if (
      st.clicks >= MARKETING_SAFETY.minClicksForNegativeKeyword &&
      st.conversions === 0 &&
      st.spend >= MARKETING_SAFETY.minSpendThbForNegativeKeyword
    ) {
      flags.push({
        code: 'search_term_waste',
        severity: 'warning',
        title: 'Wasted search term spend',
        detail: `"${st.name}" triggered ${st.clicks} clicks and ${st.spend.toFixed(0)} THB with no conversions.`,
        entityType: 'search_term',
        entityId: st.id,
        entityName: st.name,
      });
    }
  }

  if (input.landingPages.length >= 2) {
    const sorted = [...input.landingPages].sort((a, b) => (a.roas ?? 0) - (b.roas ?? 0));
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    if (
      worst &&
      best &&
      worst.id !== best.id &&
      worst.clicks >= 20 &&
      (worst.roas ?? 0) < 0.5 &&
      (best.roas ?? 0) >= 2
    ) {
      flags.push({
        code: 'landing_page_underperforming',
        severity: 'info',
        title: 'Landing page underperforming',
        detail: `${worst.name} ROAS ${(worst.roas ?? 0).toFixed(1)}x vs best page ${(best.roas ?? 0).toFixed(1)}x.`,
        entityType: 'landing_page',
        entityId: worst.id,
        entityName: worst.name,
      });
    }
  }

  return flags.slice(0, 20);
}
