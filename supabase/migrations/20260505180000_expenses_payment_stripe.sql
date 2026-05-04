-- Allow expenses paid directly from Stripe balance (before payout).

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IN (
    'cash','bank_transfer','card','qr_payment','other','stripe'
  ));
