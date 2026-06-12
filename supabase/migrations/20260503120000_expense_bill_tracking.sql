-- Dual bill checklist per expense line: (1) proof of payment / transfer to shop,
-- (2) bill from the shop (vendor receipt). For linked orders, one row per order line
-- (e.g. flowers + toys → 4 checkboxes total). Stored as JSONB on expenses.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS bill_tracking jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.expenses.bill_tracking IS
  'Array of { line_id, label, transfer_to_shop, bill_from_shop, vendor_bill_applicable? }. order:delivery = driver payment only (vendor_bill_applicable false). Else oi:/oj:/default.';
