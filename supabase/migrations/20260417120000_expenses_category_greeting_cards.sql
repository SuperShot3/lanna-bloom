-- Add expense category: greeting_cards (cards / tags that accompany gifts or bouquets)

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'flowers','packaging','delivery','advertising',
    'supplier_payment','transport','tools_equipment','soft_toys','greeting_cards','other'
  ));
