-- Add a real "paid date" to income records so monthly accounting totals align
-- with expense `date`. Without this, filters use `created_at` (when the row was
-- inserted), which can drift from when the customer actually paid — e.g. a
-- cash sale that happened yesterday but is entered today would show in today's
-- monthly total.
--
-- Backwards-compatible:
--   * Existing rows are backfilled to `created_at::date`.
--   * Default for new rows is `now()::date`, so older insert paths keep working
--     even before they're updated to set `paid_date` explicitly.

ALTER TABLE public.income_records
  ADD COLUMN IF NOT EXISTS paid_date date;

UPDATE public.income_records
   SET paid_date = created_at::date
 WHERE paid_date IS NULL;

ALTER TABLE public.income_records
  ALTER COLUMN paid_date SET NOT NULL,
  ALTER COLUMN paid_date SET DEFAULT (now()::date);

CREATE INDEX IF NOT EXISTS income_records_paid_date_idx
  ON public.income_records (paid_date DESC);
