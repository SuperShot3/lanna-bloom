-- Balloons sold with bouquets / gifts — COGS bucket with packaging, soft toys, cards.

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'flowers','packaging','delivery','advertising',
    'supplier_payment','transport','tools_equipment','soft_toys','greeting_cards','balloons','other'
  ));
