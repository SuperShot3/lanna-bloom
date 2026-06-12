-- Stripe payout / money transfer metadata.
-- Transfers remain neutral: they move money between locations and must not affect revenue or profit.

ALTER TABLE public.accounting_transfers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS bank_received_date date,
  ADD COLUMN IF NOT EXISTS attachment_file_path text,
  ADD COLUMN IF NOT EXISTS attachment_attached boolean NOT NULL DEFAULT false;

ALTER TABLE public.accounting_transfers
  DROP CONSTRAINT IF EXISTS accounting_transfers_status_check;
ALTER TABLE public.accounting_transfers
  ADD CONSTRAINT accounting_transfers_status_check
  CHECK (status IN ('pending', 'received', 'reconciled'));

COMMENT ON COLUMN public.accounting_transfers.status IS
  'Transfer lifecycle. Pending transfers are visible but do not move money-location balances until received/reconciled.';
COMMENT ON COLUMN public.accounting_transfers.external_reference IS
  'External reference such as Stripe payout ID.';
COMMENT ON COLUMN public.accounting_transfers.bank_received_date IS
  'Date the destination bank account received the transfer.';
COMMENT ON COLUMN public.accounting_transfers.attachment_file_path IS
  'Optional proof/screenshot stored in the private proofs bucket.';

CREATE INDEX IF NOT EXISTS accounting_transfers_status_idx
  ON public.accounting_transfers (status);

CREATE INDEX IF NOT EXISTS accounting_transfers_external_reference_idx
  ON public.accounting_transfers (external_reference);
