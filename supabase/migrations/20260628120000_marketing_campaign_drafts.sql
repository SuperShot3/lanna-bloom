-- Marketing Campaign Builder: draft storage (admin server-only via service_role).

CREATE TABLE IF NOT EXISTS public.marketing_campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validated', 'approved', 'created', 'failed', 'cancelled')),
  admin_email text NOT NULL,
  natural_language_prompt text NOT NULL DEFAULT '',
  question_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  structured_brief jsonb,
  campaign_draft jsonb,
  validation_result jsonb,
  selected_asset_resource_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  google_ads_resource_names jsonb,
  apply_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_drafts_status_created
  ON public.marketing_campaign_drafts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_drafts_admin_created
  ON public.marketing_campaign_drafts (admin_email, created_at DESC);

CREATE OR REPLACE FUNCTION update_marketing_campaign_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_campaign_drafts_updated_at ON public.marketing_campaign_drafts;
CREATE TRIGGER marketing_campaign_drafts_updated_at
  BEFORE UPDATE ON public.marketing_campaign_drafts
  FOR EACH ROW EXECUTE FUNCTION update_marketing_campaign_drafts_updated_at();

ALTER TABLE public.marketing_campaign_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.marketing_campaign_drafts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_campaign_drafts TO service_role;
