-- Track when staff generated a vendor "paper bill request" PDF for recovery.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS paper_bill_requested_at timestamptz;

COMMENT ON COLUMN public.expenses.paper_bill_requested_at IS
  'Timestamp when a paper bill request PDF was generated (shop/vendor follow-up).';
