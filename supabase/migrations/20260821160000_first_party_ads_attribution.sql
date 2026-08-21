-- First-party Google Ads attribution (capture + Stripe-paid conversion queue).
-- Server/admin only (service_role). Do not expose via anon/authenticated Data API.

-- ---------------------------------------------------------------------------
-- attribution_sessions: last-click snapshot per visitor (90-day window in app)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attribution_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL UNIQUE,
  source text,
  medium text,
  gclid text,
  gbraid text,
  wbraid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  campaign_id text,
  adgroup_id text,
  keyword text,
  device text,
  network text,
  matchtype text,
  landing_page text,
  referrer text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_sessions_visitor_id
  ON public.attribution_sessions (visitor_id);

CREATE INDEX IF NOT EXISTS idx_attribution_sessions_last_seen_at
  ON public.attribution_sessions (last_seen_at DESC);

COMMENT ON TABLE public.attribution_sessions IS
  'First-party last-click attribution snapshot per visitor. Click ids survive later organic/direct returns until a new Google click or 90 days.';

ALTER TABLE public.attribution_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.attribution_sessions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attribution_sessions TO service_role;

-- ---------------------------------------------------------------------------
-- orders.attribution_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attribution_id uuid REFERENCES public.attribution_sessions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_attribution_id
  ON public.orders (attribution_id)
  WHERE attribution_id IS NOT NULL;

COMMENT ON COLUMN public.orders.attribution_id IS
  'FK to attribution_sessions captured at checkout. Click ids are also denormalized onto orders.gclid|gbraid|wbraid.';

-- ---------------------------------------------------------------------------
-- google_ads_offline_conversions: one row per order (Data Manager ingest queue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_ads_offline_conversions (
  order_id text PRIMARY KEY REFERENCES public.orders (order_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('not_applicable', 'pending', 'sent', 'failed', 'retry')),
  sent_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_ads_offline_conversions_due
  ON public.google_ads_offline_conversions (status, last_attempt_at)
  WHERE status IN ('pending', 'retry');

COMMENT ON TABLE public.google_ads_offline_conversions IS
  'Queue for Google Ads Data Manager events:ingest. Unique per order_id. Legacy orders.google_ads_conversion_* columns are not used.';

CREATE OR REPLACE FUNCTION update_google_ads_offline_conversions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS google_ads_offline_conversions_updated_at ON public.google_ads_offline_conversions;
CREATE TRIGGER google_ads_offline_conversions_updated_at
  BEFORE UPDATE ON public.google_ads_offline_conversions
  FOR EACH ROW EXECUTE FUNCTION update_google_ads_offline_conversions_updated_at();

ALTER TABLE public.google_ads_offline_conversions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.google_ads_offline_conversions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.google_ads_offline_conversions TO service_role;

-- ---------------------------------------------------------------------------
-- Read-only export view (Postgres Data Manager connector later option; no PII)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.google_ads_offline_conversion_export AS
SELECT
  o.order_id,
  o.paid_at,
  o.grand_total AS value,
  'THB'::text AS currency,
  o.gclid,
  o.gbraid,
  o.wbraid,
  c.status
FROM public.orders o
JOIN public.google_ads_offline_conversions c ON c.order_id = o.order_id
WHERE upper(COALESCE(o.payment_status, '')) = 'PAID';

COMMENT ON VIEW public.google_ads_offline_conversion_export IS
  'PII-free paid-order conversion export for an optional later Data Manager PostgreSQL connection. Not required for the API ingest path.';

REVOKE ALL ON TABLE public.google_ads_offline_conversion_export FROM anon, authenticated;
GRANT SELECT ON TABLE public.google_ads_offline_conversion_export TO service_role;
