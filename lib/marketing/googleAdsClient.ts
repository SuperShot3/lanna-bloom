import 'server-only';

import { GoogleAdsApi } from 'google-ads-api';
import { cacheKey, getCached, setCached } from './cache';
import { getGoogleAdsConfig, MARKETING_SAFETY } from './config';
import { aggregateMetrics, buildMetricRow, microsToThb, resolveDateRange } from './metrics';
import type { AdsMetricRow, AdsOverview } from './types';
import { buildPerformanceFlags } from './performanceFlags';

type GaqlRow = Record<string, unknown>;

function getNested(row: GaqlRow, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, row);
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function mapCampaignRow(row: GaqlRow): AdsMetricRow {
  return buildMetricRow({
    id: str(getNested(row, 'campaign.id')),
    name: str(getNested(row, 'campaign.name')),
    spend: microsToThb(num(getNested(row, 'metrics.cost_micros'))),
    clicks: num(getNested(row, 'metrics.clicks')),
    impressions: num(getNested(row, 'metrics.impressions')),
    conversions: num(getNested(row, 'metrics.conversions')),
    conversionValue: num(getNested(row, 'metrics.conversions_value')),
  });
}

function mapAdGroupRow(row: GaqlRow): AdsMetricRow {
  return buildMetricRow({
    id: str(getNested(row, 'ad_group.id')),
    name: str(getNested(row, 'ad_group.name')),
    campaignId: str(getNested(row, 'campaign.id')),
    campaignName: str(getNested(row, 'campaign.name')),
    spend: microsToThb(num(getNested(row, 'metrics.cost_micros'))),
    clicks: num(getNested(row, 'metrics.clicks')),
    impressions: num(getNested(row, 'metrics.impressions')),
    conversions: num(getNested(row, 'metrics.conversions')),
    conversionValue: num(getNested(row, 'metrics.conversions_value')),
  });
}

function mapKeywordRow(row: GaqlRow): AdsMetricRow {
  return buildMetricRow({
    id: str(getNested(row, 'ad_group_criterion.criterion_id')),
    name: str(getNested(row, 'ad_group_criterion.keyword.text')),
    matchType: str(getNested(row, 'ad_group_criterion.keyword.match_type')),
    campaignId: str(getNested(row, 'campaign.id')),
    campaignName: str(getNested(row, 'campaign.name')),
    adGroupId: str(getNested(row, 'ad_group.id')),
    adGroupName: str(getNested(row, 'ad_group.name')),
    spend: microsToThb(num(getNested(row, 'metrics.cost_micros'))),
    clicks: num(getNested(row, 'metrics.clicks')),
    impressions: num(getNested(row, 'metrics.impressions')),
    conversions: num(getNested(row, 'metrics.conversions')),
    conversionValue: num(getNested(row, 'metrics.conversions_value')),
  });
}

function mapSearchTermRow(row: GaqlRow): AdsMetricRow {
  return buildMetricRow({
    id: `${str(getNested(row, 'search_term_view.search_term'))}:${str(getNested(row, 'ad_group.id'))}`,
    name: str(getNested(row, 'search_term_view.search_term')),
    campaignId: str(getNested(row, 'campaign.id')),
    campaignName: str(getNested(row, 'campaign.name')),
    adGroupId: str(getNested(row, 'ad_group.id')),
    adGroupName: str(getNested(row, 'ad_group.name')),
    spend: microsToThb(num(getNested(row, 'metrics.cost_micros'))),
    clicks: num(getNested(row, 'metrics.clicks')),
    impressions: num(getNested(row, 'metrics.impressions')),
    conversions: num(getNested(row, 'metrics.conversions')),
    conversionValue: num(getNested(row, 'metrics.conversions_value')),
  });
}

function mapLandingPageRow(row: GaqlRow): AdsMetricRow {
  const landingPage = str(getNested(row, 'landing_page_view.unexpanded_final_url'));
  return buildMetricRow({
    id: landingPage,
    name: landingPage,
    landingPage,
    campaignId: str(getNested(row, 'campaign.id')),
    campaignName: str(getNested(row, 'campaign.name')),
    spend: microsToThb(num(getNested(row, 'metrics.cost_micros'))),
    clicks: num(getNested(row, 'metrics.clicks')),
    impressions: num(getNested(row, 'metrics.impressions')),
    conversions: num(getNested(row, 'metrics.conversions')),
    conversionValue: num(getNested(row, 'metrics.conversions_value')),
  });
}

async function runGaql(query: string): Promise<GaqlRow[]> {
  const config = getGoogleAdsConfig();
  if (!config) {
    throw new Error('Google Ads is not configured');
  }

  const client = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  const customer = client.Customer({
    customer_id: config.customerId,
    refresh_token: config.refreshToken,
    login_customer_id: config.loginCustomerId,
  });

  const rows = await customer.query(query);
  return rows as GaqlRow[];
}

async function fetchReport<T>(
  cachePart: string,
  dateFrom: string,
  dateTo: string,
  query: string,
  mapRow: (row: GaqlRow) => T,
): Promise<T[]> {
  const key = cacheKey(['ads', cachePart, dateFrom, dateTo]);
  const cached = getCached<T[]>(key);
  if (cached) return cached;

  const rows = await runGaql(query);
  const mapped = rows.map(mapRow);
  setCached(key, mapped);
  return mapped;
}

export async function fetchAdsOverview(days: number = MARKETING_SAFETY.defaultLookbackDays): Promise<AdsOverview> {
  const { dateFrom, dateTo } = resolveDateRange(days);
  const dateFilter = `segments.date BETWEEN '${dateFrom}' AND '${dateTo}'`;

  const [campaigns, adGroups, keywords, searchTerms, landingPages] = await Promise.all([
    fetchReport(
      'campaigns',
      dateFrom,
      dateTo,
      `
        SELECT
          campaign.id,
          campaign.name,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE ${dateFilter}
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 50
      `,
      mapCampaignRow,
    ),
    fetchReport(
      'ad_groups',
      dateFrom,
      dateTo,
      `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM ad_group
        WHERE ${dateFilter}
          AND ad_group.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 50
      `,
      mapAdGroupRow,
    ),
    fetchReport(
      'keywords',
      dateFrom,
      dateTo,
      `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM keyword_view
        WHERE ${dateFilter}
          AND ad_group_criterion.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 100
      `,
      mapKeywordRow,
    ),
    fetchReport(
      'search_terms',
      dateFrom,
      dateTo,
      `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          search_term_view.search_term,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM search_term_view
        WHERE ${dateFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 100
      `,
      mapSearchTermRow,
    ),
    fetchReport(
      'landing_pages',
      dateFrom,
      dateTo,
      `
        SELECT
          campaign.id,
          campaign.name,
          landing_page_view.unexpanded_final_url,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM landing_page_view
        WHERE ${dateFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 50
      `,
      mapLandingPageRow,
    ),
  ]);

  const summary = aggregateMetrics(campaigns);
  const flags = buildPerformanceFlags({ campaigns, keywords, searchTerms, landingPages });

  return {
    dateFrom,
    dateTo,
    summary,
    campaigns,
    adGroups,
    keywords,
    searchTerms,
    landingPages,
    flags,
  };
}
