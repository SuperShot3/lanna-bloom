-- Staff-only internal notes on orders (admin dashboard).
-- Not exposed to customers, drivers, emails, or supplier task pages.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS internal_notes text;
