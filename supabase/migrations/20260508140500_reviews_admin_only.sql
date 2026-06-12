-- Reviews: admin/staff only. No public inserts.
-- Customers should leave reviews on Google; the site can display approved reviews.

-- Remove public insert policy entirely (RLS remains enabled).
DROP POLICY IF EXISTS "Allow public insert" ON public.customer_reviews;

-- Keep admin defaults consistent for dashboard inserts.
ALTER TABLE public.customer_reviews
  ALTER COLUMN status SET DEFAULT 'approved';

