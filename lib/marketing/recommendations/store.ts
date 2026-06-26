import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import type {
  MarketingRecommendation,
  RecommendationStatus,
} from '../types';
import type { RecommendationDraft } from './draftTypes';

type DbRow = {
  id: string;
  status: string;
  action_type: string;
  title: string;
  summary: string;
  reasoning: string;
  confidence: string;
  risk_level: string;
  can_apply_via_api: boolean;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_group_id: string | null;
  ad_group_name: string | null;
  keyword_text: string | null;
  search_term: string | null;
  proposed_change: Record<string, unknown> | null;
  evidence: Record<string, unknown>;
  metrics_snapshot: Record<string, unknown> | null;
  llm_model: string | null;
  llm_prompt_version: string | null;
  reviewer_email: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  apply_error: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): MarketingRecommendation {
  return {
    id: row.id,
    status: row.status as RecommendationStatus,
    actionType: row.action_type as MarketingRecommendation['actionType'],
    title: row.title,
    summary: row.summary,
    reasoning: row.reasoning,
    confidence: row.confidence as MarketingRecommendation['confidence'],
    riskLevel: row.risk_level as MarketingRecommendation['riskLevel'],
    canApplyViaApi: row.can_apply_via_api,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    adGroupId: row.ad_group_id,
    adGroupName: row.ad_group_name,
    keywordText: row.keyword_text,
    searchTerm: row.search_term,
    proposedChange: row.proposed_change,
    evidence: row.evidence ?? {},
    metricsSnapshot: row.metrics_snapshot,
    llmModel: row.llm_model,
    llmPromptVersion: row.llm_prompt_version,
    reviewerEmail: row.reviewer_email,
    reviewedAt: row.reviewed_at ?? undefined,
    appliedAt: row.applied_at ?? undefined,
    applyError: row.apply_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRecommendations(limit = 50): Promise<MarketingRecommendation[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('marketing_recommendations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as DbRow[]).map(mapRow);
}

export async function getRecommendationById(id: string): Promise<MarketingRecommendation | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('marketing_recommendations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as DbRow);
}

export async function insertRecommendations(input: {
  drafts: RecommendationDraft[];
  metricsSnapshot?: Record<string, unknown>;
  llmModel?: string | null;
  llmPromptVersion?: string | null;
}): Promise<MarketingRecommendation[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const rows = input.drafts.map((d) => ({
    status: 'new',
    action_type: d.actionType,
    title: d.title,
    summary: d.summary,
    reasoning: d.reasoning,
    confidence: d.confidence,
    risk_level: d.riskLevel,
    can_apply_via_api: d.canApplyViaApi,
    campaign_id: d.campaignId ?? null,
    campaign_name: d.campaignName ?? null,
    ad_group_id: d.adGroupId ?? null,
    ad_group_name: d.adGroupName ?? null,
    keyword_text: d.keywordText ?? null,
    search_term: d.searchTerm ?? null,
    proposed_change: d.proposedChange ?? null,
    evidence: d.evidence,
    metrics_snapshot: input.metricsSnapshot ?? null,
    llm_model: input.llmModel ?? null,
    llm_prompt_version: input.llmPromptVersion ?? null,
  }));

  const { data, error } = await supabase.from('marketing_recommendations').insert(rows).select('*');
  if (error) throw new Error(error.message);
  return (data as DbRow[]).map(mapRow);
}

export async function updateRecommendationStatus(input: {
  id: string;
  status: RecommendationStatus;
  reviewerEmail?: string;
  applyError?: string;
  googleAdsResourceNames?: Record<string, unknown>;
}): Promise<MarketingRecommendation | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const patch: Record<string, unknown> = {
    status: input.status,
  };
  if (input.reviewerEmail) {
    patch.reviewer_email = input.reviewerEmail;
    patch.reviewed_at = new Date().toISOString();
  }
  if (input.status === 'applied') {
    patch.applied_at = new Date().toISOString();
  }
  if (input.applyError) {
    patch.apply_error = input.applyError;
  }
  if (input.googleAdsResourceNames) {
    patch.google_ads_resource_names = input.googleAdsResourceNames;
  }

  const { data, error } = await supabase
    .from('marketing_recommendations')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as DbRow);
}

export async function insertApplyAudit(input: {
  recommendationId?: string;
  adminEmail: string;
  action: string;
  actionType?: string;
  dryRun?: boolean;
  requestJson?: Record<string, unknown>;
  responseJson?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from('marketing_apply_audit').insert({
    recommendation_id: input.recommendationId ?? null,
    admin_email: input.adminEmail,
    action: input.action,
    action_type: input.actionType ?? null,
    dry_run: input.dryRun ?? false,
    request_json: input.requestJson ?? null,
    response_json: input.responseJson ?? null,
    error_message: input.errorMessage ?? null,
  });
}
