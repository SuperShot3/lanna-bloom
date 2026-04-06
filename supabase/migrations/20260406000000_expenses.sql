-- Expense tracking for Lanna Bloom internal admin.
-- Private, admin-only. Receipts stored in Supabase Storage (private bucket).
-- Run via: supabase db push  OR  Supabase Dashboard → SQL Editor.

-- =============================================================================
-- 1. EXPENSES table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount          numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency        text NOT NULL DEFAULT 'THB',
  date            date NOT NULL,
  category        text NOT NULL,
  description     text NOT NULL,
  payment_method  text NOT NULL,
  receipt_file_path  text,
  receipt_attached   boolean NOT NULL DEFAULT false,
  created_by      text NOT NULL,
  notes           text,
  linked_order_id text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Category constraint – extend list by adding values here later
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'flowers','packaging','delivery','advertising',
    'supplier_payment','transport','tools_equipment','other'
  ));

-- Payment method constraint
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IN (
    'cash','bank_transfer','card','qr_payment','other'
  ));

-- =============================================================================
-- 2. INDEXES for common query patterns
-- =============================================================================
CREATE INDEX IF NOT EXISTS expenses_date_idx      ON public.expenses (date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx  ON public.expenses (category);
CREATE INDEX IF NOT EXISTS expenses_created_by_idx ON public.expenses (created_by);

-- =============================================================================
-- 3. Row-Level Security – deny all public access; service role bypasses RLS
-- =============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- No anon / authenticated policies: only the service-role key (admin backend) can read/write.
-- This table is intentionally not accessible through the anon or auth.users keys.

-- =============================================================================
-- 4. Supabase Storage – private receipts bucket
-- =============================================================================
-- Creates the bucket if it does not already exist.
-- access: private means NO public URL; signed URLs required.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,   -- 10 MB max per file
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: deny anon access; service-role bypasses storage RLS.
-- No additional policies needed because we generate signed URLs server-side.
