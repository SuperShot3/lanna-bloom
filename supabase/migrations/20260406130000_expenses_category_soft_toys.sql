-- Add expense category: soft_toys (e.g. plush / soft toys for bouquets)

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'flowers','packaging','delivery','advertising',
    'supplier_payment','transport','tools_equipment','soft_toys','other'
  ));
