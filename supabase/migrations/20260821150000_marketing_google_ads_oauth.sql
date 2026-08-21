-- Encrypted Google Ads OAuth refresh token from admin reconnect.
-- Server/admin only (service_role). Singleton row id = 1.

CREATE TABLE IF NOT EXISTS public.marketing_google_ads_oauth (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  refresh_token_ciphertext text NOT NULL,
  connected_by_email text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_marketing_google_ads_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_google_ads_oauth_updated_at ON public.marketing_google_ads_oauth;
CREATE TRIGGER marketing_google_ads_oauth_updated_at
  BEFORE UPDATE ON public.marketing_google_ads_oauth
  FOR EACH ROW EXECUTE FUNCTION update_marketing_google_ads_oauth_updated_at();

ALTER TABLE public.marketing_google_ads_oauth ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.marketing_google_ads_oauth FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_google_ads_oauth TO service_role;
