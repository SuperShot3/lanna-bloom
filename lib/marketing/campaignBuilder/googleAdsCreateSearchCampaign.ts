import 'server-only';

import { GoogleAdsApi, enums } from 'google-ads-api';
import { getGoogleAdsConfig } from '../config';
import type { SearchCampaignDraft } from './types';

function getCustomer() {
  const config = getGoogleAdsConfig();
  if (!config) throw new Error('Google Ads is not configured');

  const client = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  return {
    customer: client.Customer({
      customer_id: config.customerId,
      refresh_token: config.refreshToken,
      login_customer_id: config.loginCustomerId,
    }),
    customerId: config.customerId,
  };
}

function thbToMicros(thb: number): number {
  return Math.round(thb * 1_000_000);
}

function matchTypeEnum(matchType: string): number {
  const upper = matchType.toUpperCase();
  if (upper === 'EXACT') return enums.KeywordMatchType.EXACT;
  return enums.KeywordMatchType.PHRASE;
}

/** English language criterion ID in Google Ads. */
const ENGLISH_LANGUAGE_CRITERION = 1000;

export async function createPausedSearchCampaign(
  draft: SearchCampaignDraft,
  options?: {
    dryRun?: boolean;
    selectedAssetResourceNames?: string[];
  },
): Promise<{ resourceNames: string[]; dryRun: boolean }> {
  if (options?.dryRun) {
    const names = [
      `dry-run:budget:${draft.dailyBudgetThb}THB`,
      `dry-run:campaign:${draft.campaignName}`,
      `dry-run:location:${draft.territoryGeoTargetId}`,
      `dry-run:geoTargetType:${draft.locationTargetType ?? 'PRESENCE'}`,
      `dry-run:language:en`,
      ...draft.adGroups.flatMap((g) => [
        `dry-run:adGroup:${g.name}`,
        ...g.keywords.map((k) => `dry-run:keyword:${k.matchType}:${k.text}`),
        `dry-run:rsa:${g.name}`,
      ]),
      ...draft.negativeKeywords.map((k) => `dry-run:negative:${k.text}`),
      ...(options.selectedAssetResourceNames ?? []).map((a) => `dry-run:asset:${a}`),
    ];
    return { resourceNames: names, dryRun: true };
  }

  const { customer, customerId } = getCustomer();
  const resourceNames: string[] = [];
  const timestamp = Date.now();

  const budgetResult = await customer.campaignBudgets.create([
    {
      name: `${draft.campaignName} Budget ${timestamp}`,
      amount_micros: thbToMicros(draft.dailyBudgetThb),
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      explicitly_shared: false,
    },
  ]);
  const budgetResourceName = budgetResult.results?.[0]?.resource_name;
  if (!budgetResourceName) throw new Error('Failed to create campaign budget');
  resourceNames.push(budgetResourceName);

  const campaignPayload: Record<string, unknown> = {
    name: draft.campaignName,
    advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
    status: enums.CampaignStatus.PAUSED,
    campaign_budget: budgetResourceName,
    manual_cpc: {},
    network_settings: {
      target_google_search: true,
      target_search_network: false,
      target_content_network: false,
      target_partner_search_network: false,
    },
    geo_target_type_setting: {
      positive_geo_target_type:
        draft.locationTargetType === 'PRESENCE_OR_INTEREST'
          ? enums.PositiveGeoTargetType.PRESENCE_OR_INTEREST
          : enums.PositiveGeoTargetType.PRESENCE,
      negative_geo_target_type: enums.NegativeGeoTargetType.PRESENCE,
    },
    contains_eu_political_advertising: enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
  };

  if (draft.startDate) {
    campaignPayload.start_date = draft.startDate.replace(/-/g, '');
  }
  if (draft.endDate) {
    campaignPayload.end_date = draft.endDate.replace(/-/g, '');
  }

  const campaignResult = await customer.campaigns.create([campaignPayload]);
  const campaignResourceName = campaignResult.results?.[0]?.resource_name;
  if (!campaignResourceName) throw new Error('Failed to create campaign');
  resourceNames.push(campaignResourceName);

  await customer.campaignCriteria.create([
    {
      campaign: campaignResourceName,
      location: {
        geo_target_constant: `geoTargetConstants/${draft.territoryGeoTargetId}`,
      },
    },
    {
      campaign: campaignResourceName,
      language: {
        language_constant: `languageConstants/${ENGLISH_LANGUAGE_CRITERION}`,
      },
    },
  ]);
  resourceNames.push(`${campaignResourceName}/location:${draft.territoryGeoTargetId}`);
  resourceNames.push(`${campaignResourceName}/language:en`);

  for (const neg of draft.negativeKeywords) {
    const negResult = await customer.campaignCriteria.create([
      {
        campaign: campaignResourceName,
        negative: true,
        keyword: {
          text: neg.text,
          match_type: matchTypeEnum(neg.matchType),
        },
      },
    ]);
    const negName = negResult.results?.[0]?.resource_name;
    if (negName) resourceNames.push(negName);
  }

  for (const group of draft.adGroups) {
    const adGroupResult = await customer.adGroups.create([
      {
        name: group.name,
        campaign: campaignResourceName,
        status: enums.AdGroupStatus.PAUSED,
        type: enums.AdGroupType.SEARCH_STANDARD,
      },
    ]);
    const adGroupResourceName = adGroupResult.results?.[0]?.resource_name;
    if (!adGroupResourceName) throw new Error(`Failed to create ad group: ${group.name}`);
    resourceNames.push(adGroupResourceName);

    if (group.keywords.length > 0) {
      const keywordOps = group.keywords.map((kw) => ({
        ad_group: adGroupResourceName,
        status: enums.AdGroupCriterionStatus.ENABLED,
        keyword: {
          text: kw.text,
          match_type: matchTypeEnum(kw.matchType),
        },
      }));
      const kwResult = await customer.adGroupCriteria.create(keywordOps);
      for (const r of kwResult.results ?? []) {
        if (r.resource_name) resourceNames.push(r.resource_name);
      }
    }

    const rsaResult = await customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: enums.AdGroupAdStatus.PAUSED,
        ad: {
          responsive_search_ad: {
            headlines: group.headlines.map((text) => ({ text })),
            descriptions: group.descriptions.map((text) => ({ text })),
          },
          final_urls: [group.finalUrl],
        },
      },
    ]);
    const adResourceName = rsaResult.results?.[0]?.resource_name;
    if (adResourceName) resourceNames.push(adResourceName);
  }

  if (options?.selectedAssetResourceNames?.length) {
    for (const assetResourceName of options.selectedAssetResourceNames) {
      resourceNames.push(`asset-linked:${assetResourceName}`);
    }
  }

  return { resourceNames, dryRun: false };
}

export function getCustomerIdForDryRun(): string | null {
  return getGoogleAdsConfig()?.customerId ?? null;
}
