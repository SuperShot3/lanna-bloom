import 'server-only';

import { MARKETING_SAFETY } from './config';
import type {
  MarketingRecommendation,
  RecommendationActionType,
  RecommendationEvidence,
} from './types';

export interface SafetyValidationResult {
  ok: boolean;
  reason?: string;
}

function hasMinimumData(evidence: RecommendationEvidence, minClicks: number, minSpend: number): boolean {
  const clicks = evidence.clicks ?? 0;
  const spend = evidence.spend ?? 0;
  return clicks >= minClicks && spend >= minSpend;
}

export function validateRecommendationForApproval(rec: Pick<
  MarketingRecommendation,
  'actionType' | 'evidence' | 'canApplyViaApi'
>): SafetyValidationResult {
  if (!rec.canApplyViaApi) {
    return { ok: false, reason: 'This recommendation requires manual review in Google Ads.' };
  }

  switch (rec.actionType) {
    case 'pause_keyword':
      if (
        !hasMinimumData(
          rec.evidence,
          MARKETING_SAFETY.minClicksForKeywordAction,
          MARKETING_SAFETY.minSpendThbForKeywordAction,
        )
      ) {
        return {
          ok: false,
          reason: `Need at least ${MARKETING_SAFETY.minClicksForKeywordAction} clicks and ${MARKETING_SAFETY.minSpendThbForKeywordAction} THB spend before pausing.`,
        };
      }
      return { ok: true };
    case 'add_negative_keyword':
      if (
        !hasMinimumData(
          rec.evidence,
          MARKETING_SAFETY.minClicksForNegativeKeyword,
          MARKETING_SAFETY.minSpendThbForNegativeKeyword,
        )
      ) {
        return {
          ok: false,
          reason: `Need at least ${MARKETING_SAFETY.minClicksForNegativeKeyword} clicks and ${MARKETING_SAFETY.minSpendThbForNegativeKeyword} THB spend before adding a negative.`,
        };
      }
      return { ok: true };
    case 'adjust_campaign_budget': {
      const changePercent = Number(rec.evidence.budgetChangePercent ?? 0);
      if (changePercent > MARKETING_SAFETY.maxBudgetIncreasePercent) {
        return { ok: false, reason: 'Budget increases are not allowed in this version.' };
      }
      if (Math.abs(changePercent) > MARKETING_SAFETY.maxBudgetDecreasePercent) {
        return {
          ok: false,
          reason: `Budget changes are limited to ${MARKETING_SAFETY.maxBudgetDecreasePercent}% decrease.`,
        };
      }
      return { ok: true };
    }
    case 'enable_keyword':
      return { ok: true };
    default:
      return { ok: false, reason: 'Action type cannot be applied automatically.' };
  }
}

export function isAllowedApplyAction(actionType: RecommendationActionType): boolean {
  return (
    actionType === 'add_negative_keyword' ||
    actionType === 'pause_keyword' ||
    actionType === 'enable_keyword' ||
    actionType === 'adjust_campaign_budget'
  );
}
