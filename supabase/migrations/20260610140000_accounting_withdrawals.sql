-- Owner / personal withdrawals: money leaves the business ledger for personal use.
-- Not income, not expense, not inter-bucket transfer. Reduces location balance only.

CREATE TABLE IF NOT EXISTS public.accounting_withdrawals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'THB',
  withdrawal_date   date NOT NULL DEFAULT (now()::date),
  from_location     text NOT NULL,
  purpose           text NOT NULL,
  notes             text,
  status            text NOT NULL DEFAULT 'confirmed',
  proof_file_path   text,
  proof_attached    boolean NOT NULL DEFAULT false,
  created_by        text NOT NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.accounting_withdrawals
  ADD CONSTRAINT accounting_withdrawals_from_location_check
  CHECK (from_location IN ('bank', 'cash', 'stripe', 'other'));

ALTER TABLE public.accounting_withdrawals
  ADD CONSTRAINT accounting_withdrawals_status_check
  CHECK (status IN ('pending', 'confirmed'));

CREATE INDEX IF NOT EXISTS accounting_withdrawals_withdrawal_date_idx
  ON public.accounting_withdrawals (withdrawal_date DESC);

CREATE INDEX IF NOT EXISTS accounting_withdrawals_from_location_idx
  ON public.accounting_withdrawals (from_location);

CREATE INDEX IF NOT EXISTS accounting_withdrawals_created_at_idx
  ON public.accounting_withdrawals (created_at DESC);

ALTER TABLE public.accounting_withdrawals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.accounting_withdrawals FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounting_withdrawals TO service_role;
