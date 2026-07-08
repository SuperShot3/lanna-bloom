-- Google Ads conversion upload fallback (Phase 2).
-- google_ads_conversion_sent = Ads conversion delivered (browser GTM or Upload API).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_ads_conversion_sent boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_ads_conversion_sent_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_ads_conversion_source text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_ads_conversion_attempts integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_ads_conversion_last_error text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_ads_conversion_last_attempt_at timestamptz;

COMMENT ON COLUMN public.orders.google_ads_conversion_sent IS
  'True once Google Ads purchase conversion was delivered (browser GTM or Upload API fallback)';
COMMENT ON COLUMN public.orders.google_ads_conversion_sent_at IS
  'When Google Ads purchase conversion was delivered';
COMMENT ON COLUMN public.orders.google_ads_conversion_source IS
  'How Ads conversion was delivered: browser | upload_api';
COMMENT ON COLUMN public.orders.google_ads_conversion_attempts IS
  'Number of Google Ads Conversion Upload API attempts';
COMMENT ON COLUMN public.orders.google_ads_conversion_last_error IS
  'Last Google Ads Conversion Upload API error (if any)';
COMMENT ON COLUMN public.orders.google_ads_conversion_last_attempt_at IS
  'Last Google Ads Conversion Upload API attempt timestamp';

-- Browser-confirmed GA4 purchases already fired the GTM Ads tag on the same purchase event.
UPDATE public.orders
SET google_ads_conversion_sent = true,
    google_ads_conversion_sent_at = COALESCE(google_ads_conversion_sent_at, ga4_purchase_sent_at),
    google_ads_conversion_source = 'browser'
WHERE ga4_purchase_sent IS TRUE
  AND COALESCE(ga4_purchase_source, '') = 'browser'
  AND COALESCE(google_ads_conversion_sent, false) IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_google_ads_conversion_pending
  ON public.orders (ga4_purchase_fallback_run_after)
  WHERE google_ads_conversion_sent IS NOT TRUE
    AND upper(COALESCE(payment_status, '')) = 'PAID';
