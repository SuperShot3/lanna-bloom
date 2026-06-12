-- Customer reviews: name + comment, no verification required.
-- Shareable link for customers to leave feedback.

CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'hidden'))
);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_created_at ON public.customer_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_status ON public.customer_reviews(status);

-- RLS: allow anyone to insert (no auth); allow public read of approved only
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.customer_reviews
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public read approved" ON public.customer_reviews
  FOR SELECT TO anon, authenticated USING (status = 'approved');

-- Admin reads/updates via service role (bypasses RLS)
