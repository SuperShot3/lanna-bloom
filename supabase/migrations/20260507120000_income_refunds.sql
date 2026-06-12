-- Refunds reduce recognized revenue for a period without altering UNIQUE(order_id) on income_records.
-- One row per Stripe refund (or manual adjustment); keyed by stripe_refund_id when present.

CREATE TABLE IF NOT EXISTS public.income_refunds (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          text NOT NULL,
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'THB',
  refunded_at       date NOT NULL,
  source            text NOT NULL DEFAULT 'stripe',
  stripe_refund_id  text UNIQUE,
  notes             text,
  created_by        text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS income_refunds_order_id_idx
  ON public.income_refunds (order_id);
CREATE INDEX IF NOT EXISTS income_refunds_refunded_at_idx
  ON public.income_refunds (refunded_at DESC);

ALTER TABLE public.income_refunds
  DROP CONSTRAINT IF EXISTS income_refunds_source_check;
ALTER TABLE public.income_refunds
  ADD CONSTRAINT income_refunds_source_check
  CHECK (source IN ('stripe', 'manual'));

ALTER TABLE public.income_refunds ENABLE ROW LEVEL SECURITY;
