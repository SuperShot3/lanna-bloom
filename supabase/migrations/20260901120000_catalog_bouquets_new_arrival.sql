-- New Arrivals merchandising window for bouquets.
-- NULL = ordinary catalog item (or admin ended). Non-null = start of current 45-day window.
-- Expiry is evaluated at read time; no cron. Existing rows stay NULL (no surprise badges).

ALTER TABLE public.catalog_bouquets
  ADD COLUMN IF NOT EXISTS new_arrival_started_at timestamptz NULL;

COMMENT ON COLUMN public.catalog_bouquets.new_arrival_started_at IS
  'Start of the current new-arrival storefront window (45 days). NULL = inactive / ordinary item.';

CREATE INDEX IF NOT EXISTS catalog_bouquets_new_arrival_started_at_idx
  ON public.catalog_bouquets (new_arrival_started_at DESC)
  WHERE new_arrival_started_at IS NOT NULL;
