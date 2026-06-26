-- Marketing Insights: AI recommendations and apply audit (admin server-only via service_role).

CREATE TABLE IF NOT EXISTS public.marketing_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'approved', 'rejected', 'applied', 'failed', 'rolled_back_note')),
  action_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  reasoning text NOT NULL DEFAULT '',
  confidence text NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('low', 'medium', 'high')),
  risk_level text NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  can_apply_via_api boolean NOT NULL DEFAULT false,
  campaign_id text,
  campaign_name text,
  ad_group_id text,
  ad_group_name text,
  keyword_text text,
  search_term text,
  proposed_change jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics_snapshot jsonb,
  llm_model text,
  llm_prompt_version text,
  reviewer_email text,
  reviewed_at timestamptz,
  applied_at timestamptz,
  apply_error text,
  google_ads_resource_names jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_recommendations_status_created
  ON public.marketing_recommendations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_apply_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid REFERENCES public.marketing_recommendations(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  action_type text,
  dry_run boolean NOT NULL DEFAULT false,
  request_json jsonb,
  response_json jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_apply_audit_created
  ON public.marketing_apply_audit (created_at DESC);

CREATE OR REPLACE FUNCTION update_marketing_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_recommendations_updated_at ON public.marketing_recommendations;
CREATE TRIGGER marketing_recommendations_updated_at
  BEFORE UPDATE ON public.marketing_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_marketing_recommendations_updated_at();

ALTER TABLE public.marketing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_apply_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.marketing_recommendations FROM anon, authenticated;
REVOKE ALL ON TABLE public.marketing_apply_audit FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_recommendations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_apply_audit TO service_role;
