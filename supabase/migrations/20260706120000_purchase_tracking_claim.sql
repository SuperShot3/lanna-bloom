-- Order-level purchase tracking claim (browser dataLayer purchase dedupe).
--
-- ga4_purchase_sent / ga4_purchase_sent_at are repurposed from the removed GA4
-- Measurement Protocol flow: they now mean "browser purchase tracking has been
-- claimed for this order". The claim endpoint
-- (POST /api/orders/[orderId]/claim-purchase) performs an atomic conditional
-- UPDATE on these columns so exactly one browser globally can fire `purchase`
-- per order (GA4 + Google Ads listen to the same dataLayer event via GTM).

COMMENT ON COLUMN public.orders.ga4_purchase_sent IS
  'True once browser purchase tracking was claimed for this order (order-level dedupe across devices/browsers; set atomically by /api/orders/[orderId]/claim-purchase)';
COMMENT ON COLUMN public.orders.ga4_purchase_sent_at IS
  'When purchase tracking was claimed for this order';

-- Backfill: orders paid before this deploy are considered already tracked, so old
-- thank-you redirects (purchase_tracked=0) or reopened links can never fire a late
-- duplicate purchase after the claim logic ships.
UPDATE public.orders
SET ga4_purchase_sent = true,
    ga4_purchase_sent_at = COALESCE(ga4_purchase_sent_at, now())
WHERE ga4_purchase_sent IS DISTINCT FROM true
  AND (upper(COALESCE(payment_status, '')) = 'PAID' OR paid_at IS NOT NULL);
