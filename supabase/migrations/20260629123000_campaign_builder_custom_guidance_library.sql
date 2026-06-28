-- Campaign Builder reusable custom guidance library (admin server-only).

CREATE TABLE IF NOT EXISTS public.marketing_campaign_guidance_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN (
    'market_notes',
    'audience_contexts',
    'occasions',
    'delivery_contexts',
    'ad_group_ideas',
    'keyword_themes',
    'negative_themes',
    'copy_instructions'
  )),
  label text NOT NULL,
  normalized_label text NOT NULL,
  created_by_admin_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaign_guidance_label_not_empty CHECK (length(btrim(label)) > 0),
  CONSTRAINT marketing_campaign_guidance_label_length CHECK (length(label) <= 48)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_campaign_guidance_category_label
  ON public.marketing_campaign_guidance_library (category, normalized_label);

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_guidance_category_created
  ON public.marketing_campaign_guidance_library (category, created_at DESC);

CREATE OR REPLACE FUNCTION update_marketing_campaign_guidance_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_campaign_guidance_library_updated_at
  ON public.marketing_campaign_guidance_library;
CREATE TRIGGER marketing_campaign_guidance_library_updated_at
  BEFORE UPDATE ON public.marketing_campaign_guidance_library
  FOR EACH ROW EXECUTE FUNCTION update_marketing_campaign_guidance_library_updated_at();

ALTER TABLE public.marketing_campaign_guidance_library ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.marketing_campaign_guidance_library FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_campaign_guidance_library TO service_role;
