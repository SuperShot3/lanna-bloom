-- Partner applications table (Supabase only; no partner_products)
-- Applications workflow; partner auth; Sanity holds partners + products

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  -- Contact
  shop_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  line_id text,
  phone text NOT NULL,
  instagram text,
  facebook text,
  -- Location
  address text,
  district text,
  lat numeric,
  lng numeric,
  -- Delivery
  self_deliver boolean DEFAULT false,
  delivery_zones text,
  delivery_fee_note text,
  -- Capacity
  categories text[],
  prep_time text,
  cutoff_time text,
  max_orders_per_day int,
  -- Portfolio
  sample_photo_urls text[],
  experience_note text,
  -- Status & admin
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_changes', 'draft')),
  admin_note text,
  user_id uuid REFERENCES auth.users(id),
  sanity_partner_id text
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_user_id ON public.partner_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at ON public.partner_applications(created_at DESC);

-- RLS: public can insert (apply); admin uses service role for read/update
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.partner_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin reads/updates via service role (bypasses RLS) or add policy for admin role if needed
