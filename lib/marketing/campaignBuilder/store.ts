import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { CAMPAIGN_BUILDER_PROMPT_VERSION } from './types';
import type {
  CampaignBrief,
  CampaignDraftRecord,
  CampaignDraftStatus,
  CampaignValidationResult,
  SearchCampaignDraft,
} from './types';

type DbRow = {
  id: string;
  status: string;
  admin_email: string;
  natural_language_prompt: string;
  question_answers: Record<string, unknown>;
  structured_brief: Record<string, unknown> | null;
  campaign_draft: Record<string, unknown> | null;
  validation_result: Record<string, unknown> | null;
  selected_asset_resource_names: string[] | null;
  google_ads_resource_names: Record<string, unknown> | null;
  apply_error: string | null;
  wizard_step: string | null;
  step_approvals: Record<string, unknown> | null;
  step_outputs: Record<string, unknown> | null;
  territory_context: Record<string, unknown> | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): CampaignDraftRecord {
  return {
    id: row.id,
    status: row.status as CampaignDraftStatus,
    adminEmail: row.admin_email,
    naturalLanguagePrompt: row.natural_language_prompt,
    questionAnswers: row.question_answers ?? {},
    structuredBrief: (row.structured_brief as CampaignBrief | null) ?? null,
    campaignDraft: (row.campaign_draft as SearchCampaignDraft | null) ?? null,
    validationResult: (row.validation_result as CampaignValidationResult | null) ?? null,
    selectedAssetResourceNames: row.selected_asset_resource_names ?? [],
    googleAdsResourceNames: row.google_ads_resource_names,
    applyError: row.apply_error ?? undefined,
    wizardStep: row.wizard_step ?? 'location',
    stepApprovals: (row.step_approvals as CampaignDraftRecord['stepApprovals']) ?? {},
    stepOutputs: (row.step_outputs as CampaignDraftRecord['stepOutputs']) ?? {},
    territoryContext: row.territory_context,
    promptVersion: row.prompt_version ?? CAMPAIGN_BUILDER_PROMPT_VERSION,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCampaignDrafts(limit = 50): Promise<CampaignDraftRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('marketing_campaign_drafts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as DbRow[]).map(mapRow);
}

export async function getCampaignDraftById(id: string): Promise<CampaignDraftRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('marketing_campaign_drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as DbRow);
}

export async function insertCampaignDraft(input: {
  adminEmail: string;
  naturalLanguagePrompt?: string;
  questionAnswers?: Record<string, unknown>;
  structuredBrief?: CampaignBrief;
  campaignDraft?: SearchCampaignDraft;
  wizardStep?: string;
  stepOutputs?: Record<string, unknown>;
  territoryContext?: Record<string, unknown> | null;
}): Promise<CampaignDraftRecord> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('marketing_campaign_drafts')
    .insert({
      admin_email: input.adminEmail,
      natural_language_prompt: input.naturalLanguagePrompt ?? '',
      question_answers: input.questionAnswers ?? {},
      structured_brief: input.structuredBrief ?? null,
      campaign_draft: input.campaignDraft ?? null,
      status: 'draft',
      wizard_step: input.wizardStep ?? 'location',
      step_outputs: input.stepOutputs ?? {},
      step_approvals: {},
      territory_context: input.territoryContext ?? null,
      prompt_version: CAMPAIGN_BUILDER_PROMPT_VERSION,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as DbRow);
}

export async function updateCampaignDraft(input: {
  id: string;
  status?: CampaignDraftStatus;
  naturalLanguagePrompt?: string;
  questionAnswers?: Record<string, unknown>;
  structuredBrief?: CampaignBrief | null;
  campaignDraft?: SearchCampaignDraft | null;
  validationResult?: CampaignValidationResult | null;
  selectedAssetResourceNames?: string[];
  googleAdsResourceNames?: Record<string, unknown> | null;
  applyError?: string | null;
  wizardStep?: string;
  stepApprovals?: Record<string, { approvedAt: string; approvedBy: string }>;
  stepOutputs?: Record<string, unknown>;
  territoryContext?: Record<string, unknown> | null;
}): Promise<CampaignDraftRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.questionAnswers) patch.question_answers = input.questionAnswers;
  if (input.structuredBrief !== undefined) patch.structured_brief = input.structuredBrief;
  if (input.campaignDraft !== undefined) patch.campaign_draft = input.campaignDraft;
  if (input.validationResult !== undefined) patch.validation_result = input.validationResult;
  if (input.selectedAssetResourceNames) {
    patch.selected_asset_resource_names = input.selectedAssetResourceNames;
  }
  if (input.googleAdsResourceNames !== undefined) {
    patch.google_ads_resource_names = input.googleAdsResourceNames;
  }
  if (input.applyError !== undefined) patch.apply_error = input.applyError;
  if (input.wizardStep) patch.wizard_step = input.wizardStep;
  if (input.naturalLanguagePrompt !== undefined) {
    patch.natural_language_prompt = input.naturalLanguagePrompt;
  }
  if (input.stepApprovals) patch.step_approvals = input.stepApprovals;
  if (input.stepOutputs) patch.step_outputs = input.stepOutputs;
  if (input.territoryContext !== undefined) patch.territory_context = input.territoryContext;

  const { data, error } = await supabase
    .from('marketing_campaign_drafts')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as DbRow);
}

export async function insertCampaignBuilderAudit(input: {
  draftId: string;
  adminEmail: string;
  action: string;
  dryRun?: boolean;
  requestJson?: Record<string, unknown>;
  responseJson?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from('marketing_apply_audit').insert({
    recommendation_id: null,
    admin_email: input.adminEmail,
    action: input.action,
    action_type: 'campaign_builder',
    dry_run: input.dryRun ?? false,
    request_json: {
      draftId: input.draftId,
      ...input.requestJson,
    },
    response_json: input.responseJson ?? null,
    error_message: input.errorMessage ?? null,
  });
}
