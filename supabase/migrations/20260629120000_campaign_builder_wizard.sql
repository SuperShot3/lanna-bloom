-- Campaign Builder wizard: step tracking, per-step outputs, territory context.

ALTER TABLE public.marketing_campaign_drafts
  ADD COLUMN IF NOT EXISTS wizard_step text NOT NULL DEFAULT 'location',
  ADD COLUMN IF NOT EXISTS step_approvals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS step_outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS territory_context jsonb,
  ADD COLUMN IF NOT EXISTS prompt_version text NOT NULL DEFAULT 'campaign-builder-v2-wizard';

ALTER TABLE public.marketing_campaign_drafts
  DROP CONSTRAINT IF EXISTS marketing_campaign_drafts_wizard_step_check;

ALTER TABLE public.marketing_campaign_drafts
  ADD CONSTRAINT marketing_campaign_drafts_wizard_step_check
  CHECK (wizard_step IN (
    'location',
    'audience',
    'ad_groups',
    'keywords',
    'negative_keywords',
    'ad_copy'
  ));

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_drafts_wizard_step
  ON public.marketing_campaign_drafts (wizard_step, created_at DESC);
