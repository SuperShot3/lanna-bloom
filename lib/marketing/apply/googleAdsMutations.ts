import 'server-only';

import { GoogleAdsApi, enums } from 'google-ads-api';
import { getGoogleAdsConfig } from '../config';
import type { MarketingRecommendation } from '../types';

function getCustomer() {
  const config = getGoogleAdsConfig();
  if (!config) throw new Error('Google Ads is not configured');

  const client = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  return client.Customer({
    customer_id: config.customerId,
    refresh_token: config.refreshToken,
    login_customer_id: config.loginCustomerId,
  });
}

function matchTypeEnum(matchType: string | undefined): number {
  const upper = (matchType ?? 'PHRASE').toUpperCase();
  if (upper === 'EXACT') return enums.KeywordMatchType.EXACT;
  if (upper === 'BROAD') return enums.KeywordMatchType.BROAD;
  return enums.KeywordMatchType.PHRASE;
}

export async function applyRecommendationToGoogleAds(
  rec: MarketingRecommendation,
  options?: { dryRun?: boolean },
): Promise<{ resourceNames: string[]; dryRun: boolean }> {
  if (options?.dryRun) {
    return { resourceNames: [`dry-run:${rec.actionType}`], dryRun: true };
  }

  const customer = getCustomer();
  const resourceNames: string[] = [];

  switch (rec.actionType) {
    case 'add_negative_keyword': {
      const keywordText = rec.searchTerm ?? rec.keywordText ?? String(rec.proposedChange?.keywordText ?? '');
      const campaignId = rec.campaignId;
      if (!keywordText) throw new Error('Missing keyword text for negative keyword');
      if (!campaignId) throw new Error('Missing campaign ID for negative keyword');

      const campaignResource = `customers/${getGoogleAdsConfig()!.customerId}/campaigns/${campaignId}`;
      const result = await customer.campaignCriteria.create([
        {
          campaign: campaignResource,
          negative: true,
          keyword: {
            text: keywordText,
            match_type: matchTypeEnum(String(rec.proposedChange?.matchType ?? 'PHRASE')),
          },
        },
      ]);
      for (const r of result.results ?? []) {
        if (r.resource_name) resourceNames.push(r.resource_name);
      }
      break;
    }
    case 'pause_keyword': {
      const adGroupId = rec.adGroupId;
      const criterionId = rec.evidence.criterionId ?? rec.proposedChange?.criterionId;
      if (!adGroupId || !criterionId) {
        throw new Error('Missing ad group or criterion ID — pause keyword requires manual setup in Google Ads.');
      }
      const resourceName = `customers/${getGoogleAdsConfig()!.customerId}/adGroupCriteria/${adGroupId}~${criterionId}`;
      await customer.adGroupCriteria.update([
        {
          resource_name: resourceName,
          status: enums.AdGroupCriterionStatus.PAUSED,
        },
      ]);
      resourceNames.push(resourceName);
      break;
    }
    case 'adjust_campaign_budget': {
      throw new Error('Budget adjustments are not enabled in v1.');
    }
    default:
      throw new Error(`Action ${rec.actionType} cannot be applied via API.`);
  }

  return { resourceNames, dryRun: false };
}
