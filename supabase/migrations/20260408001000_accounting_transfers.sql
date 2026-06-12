-- Internal accounting transfers (move funds between money locations).
-- Example: Stripe payout (stripe → bank), cash withdrawal (bank → cash).
-- Transfers must NOT affect profit; they only re-allocate balances between locations.

CREATE TABLE IF NOT EXISTS public.accounting_transfers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  currency       text NOT NULL DEFAULT 'THB',
  transfer_date  date NOT NULL DEFAULT (now()::date),
  from_location  text NOT NULL,
  to_location    text NOT NULL,
  note           text,
  created_by     text NOT NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE public.accounting_transfers
  DROP CONSTRAINT IF EXISTS accounting_transfers_locations_check;
ALTER TABLE public.accounting_transfers
  ADD CONSTRAINT accounting_transfers_locations_check
  CHECK (
    from_location IN ('bank','cash','stripe','other')
    AND to_location IN ('bank','cash','stripe','other')
    AND from_location <> to_location
  );

CREATE INDEX IF NOT EXISTS accounting_transfers_transfer_date_idx
  ON public.accounting_transfers (transfer_date DESC);

CREATE INDEX IF NOT EXISTS accounting_transfers_created_at_idx
  ON public.accounting_transfers (created_at DESC);

ALTER TABLE public.accounting_transfers ENABLE ROW LEVEL SECURITY;
-- No policies: service role only (admin backend).

