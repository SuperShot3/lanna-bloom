-- Auto-synced delivery (driver) expenses were previously stored as payment_method = 'cash'.
-- Shop pays drivers from bank (PromptPay/transfer); allocate these under bank in accounting overview.
-- See docs/ACCOUNTING_AND_EXPENSES.md.

UPDATE public.expenses
SET
  payment_method = 'bank_transfer',
  updated_at = now()
WHERE category = 'delivery'
  AND COALESCE(trim(notes::text), '') = 'Auto from order delivery cost'
  AND payment_method = 'cash';
