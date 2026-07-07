-- GA4 purchase fallback: separate browser claim from successful delivery.
-- ga4_purchase_claimed = browser won atomic claim (may push dataLayer purchase).
-- ga4_purchase_sent = purchase successfully recorded in GA4 (browser confirm or Measurement Protocol).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_claimed boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_claimed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_source text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_last_error text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_attempts integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_fallback_run_after timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_mp_lock_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gclid text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gbraid text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wbraid text;

COMMENT ON COLUMN public.orders.ga4_purchase_claimed IS
  'True once browser purchase tracking was claimed (atomic dedupe before dataLayer push)';
COMMENT ON COLUMN public.orders.ga4_purchase_claimed_at IS
  'When browser purchase tracking was claimed';
COMMENT ON COLUMN public.orders.ga4_purchase_sent IS
  'True once GA4 purchase was successfully delivered (browser confirm or Measurement Protocol fallback)';
COMMENT ON COLUMN public.orders.ga4_purchase_sent_at IS
  'When GA4 purchase was successfully delivered';
COMMENT ON COLUMN public.orders.ga4_purchase_source IS
  'How purchase was delivered: browser | measurement_protocol';
COMMENT ON COLUMN public.orders.ga4_purchase_last_error IS
  'Last Measurement Protocol send error (if any)';
COMMENT ON COLUMN public.orders.ga4_purchase_attempts IS
  'Number of Measurement Protocol send attempts';
COMMENT ON COLUMN public.orders.ga4_purchase_fallback_run_after IS
  'Earliest time server may attempt Measurement Protocol fallback (lets browser win first)';
COMMENT ON COLUMN public.orders.ga4_purchase_mp_lock_at IS
  'Short-lived lock while a Measurement Protocol send is in progress';
COMMENT ON COLUMN public.orders.ga_session_id IS
  'Optional GA4 session_id from browser for Measurement Protocol attribution';
COMMENT ON COLUMN public.orders.gclid IS
  'Google Ads click id captured at checkout (if available)';
COMMENT ON COLUMN public.orders.gbraid IS
  'Google Ads gbraid captured at checkout (if available)';
COMMENT ON COLUMN public.orders.wbraid IS
  'Google Ads wbraid captured at checkout (if available)';

-- Historical rows used ga4_purchase_sent as "claimed"; treat as both claimed and sent.
UPDATE public.orders
SET ga4_purchase_claimed = true,
    ga4_purchase_claimed_at = COALESCE(ga4_purchase_claimed_at, ga4_purchase_sent_at, now())
WHERE ga4_purchase_sent IS TRUE
  AND COALESCE(ga4_purchase_claimed, false) IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_ga4_purchase_fallback_pending
  ON public.orders (ga4_purchase_fallback_run_after)
  WHERE ga4_purchase_sent IS NOT TRUE
    AND upper(COALESCE(payment_status, '')) = 'PAID';
