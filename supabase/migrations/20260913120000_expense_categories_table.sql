-- expense_categories: DB-backed replacement for the hardcoded ExpenseCategory union.
-- `value` is immutable once created (FK target on expenses.category). 'flowers' and
-- 'delivery' are is_system=true because order-cost auto-sync and bill tracking hardcode
-- those two literal strings — they must never be renamed or archived.

CREATE TABLE public.expense_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value       text NOT NULL UNIQUE CHECK (value ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  label       text NOT NULL,
  color       text NOT NULL,
  is_cogs     boolean NOT NULL DEFAULT false,
  is_system   boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.expense_categories IS
  'Expense category taxonomy. value is immutable once created (FK target on expenses.category). is_system rows (flowers, delivery) cannot be archived — hardcoded elsewhere (order costs sync, bill tracking).';
COMMENT ON COLUMN public.expense_categories.value IS
  'Immutable slug stored on expenses.category. Never change after creation.';

CREATE INDEX expense_categories_active_idx ON public.expense_categories (active);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.expense_categories FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.expense_categories TO service_role;
-- No DELETE grant: categories are archived (active=false), never hard-deleted, so
-- existing expenses.category FK references are never orphaned.

-- Seed the current 11 hardcoded categories (values/labels/COGS flags copied verbatim
-- from types/expenses.ts EXPENSE_CATEGORIES + COGS_EXPENSE_CATEGORIES so existing data
-- and behavior are unchanged). sort_order matches the existing EXPENSE_CATEGORIES display
-- order. Colors match the approved admin dashboard redesign mockup.
INSERT INTO public.expense_categories (value, label, color, is_cogs, is_system, sort_order) VALUES
  ('flowers',          'Flowers',           '#1A3C34', true,  true,  1),
  ('packaging',        'Packaging',         '#C5A059', true,  false, 2),
  ('delivery',         'Delivery',          '#B45309', true,  true,  3),
  ('balloons',         'Balloons',          '#DB2777', true,  false, 4),
  ('soft_toys',        'Soft toys',         '#0D9488', true,  false, 5),
  ('greeting_cards',   'Greeting cards',    '#4F46E5', true,  false, 6),
  ('advertising',      'Advertising',       '#7C3AED', false, false, 7),
  ('supplier_payment', 'Supplier Payment',  '#2563EB', false, false, 8),
  ('transport',        'Transport',         '#64748B', false, false, 9),
  ('tools_equipment',  'Tools & Equipment', '#C2410C', false, false, 10),
  ('other',            'Other',             '#94A3B8', false, false, 11);

-- Replace the CHECK constraint with a FK so new categories no longer require a migration.
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_fkey
  FOREIGN KEY (category) REFERENCES public.expense_categories(value)
  ON UPDATE RESTRICT ON DELETE RESTRICT;
