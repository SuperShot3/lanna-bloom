-- Income records for Lanna Bloom accounting module.
-- Supports both automatic order-based income and manual entries.
-- Run via: supabase db push  OR  Supabase Dashboard → SQL Editor.

-- =============================================================================
-- 1. INCOME_RECORDS table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.income_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to order (nullable for manual/legacy/offline entries)
  order_id          text UNIQUE,   -- UNIQUE ensures one income per order (dedup)

  -- How the record was created
  source_mode       text NOT NULL DEFAULT 'manual',
  -- 'auto_order' = created by payment hook, 'manual' = admin entered

  -- What kind of income
  source_type       text NOT NULL DEFAULT 'order',
  -- 'order' | 'legacy_order' | 'offline_sale' | 'adjustment'

  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'THB',

  payment_method    text NOT NULL,
  -- 'cash' | 'bank_transfer' | 'stripe' | 'qr_payment' | 'other'

  money_location    text NOT NULL,
  -- Where the money landed: 'bank' | 'cash' | 'stripe' | 'other'

  income_status     text NOT NULL DEFAULT 'confirmed',
  -- 'confirmed' | 'pending' | 'cancelled'

  description       text NOT NULL,
  external_reference text,   -- optional: Stripe PI, LINE payment ref, bank slip no.

  -- Receipt / proof of payment
  proof_file_path   text,
  receipt_attached  boolean NOT NULL DEFAULT false,

  notes             text,

  -- Who and when
  created_by        text NOT NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  confirmed_at      timestamptz
);

-- =============================================================================
-- 2. Constraints
-- =============================================================================
ALTER TABLE public.income_records
  DROP CONSTRAINT IF EXISTS income_records_source_mode_check;
ALTER TABLE public.income_records
  ADD CONSTRAINT income_records_source_mode_check
  CHECK (source_mode IN ('auto_order', 'manual'));

ALTER TABLE public.income_records
  DROP CONSTRAINT IF EXISTS income_records_source_type_check;
ALTER TABLE public.income_records
  ADD CONSTRAINT income_records_source_type_check
  CHECK (source_type IN ('order', 'legacy_order', 'offline_sale', 'adjustment'));

ALTER TABLE public.income_records
  DROP CONSTRAINT IF EXISTS income_records_income_status_check;
ALTER TABLE public.income_records
  ADD CONSTRAINT income_records_income_status_check
  CHECK (income_status IN ('confirmed', 'pending', 'cancelled'));

-- =============================================================================
-- 3. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS income_records_order_id_idx     ON public.income_records (order_id);
CREATE INDEX IF NOT EXISTS income_records_created_at_idx   ON public.income_records (created_at DESC);
CREATE INDEX IF NOT EXISTS income_records_source_mode_idx  ON public.income_records (source_mode);
CREATE INDEX IF NOT EXISTS income_records_income_status_idx ON public.income_records (income_status);

-- =============================================================================
-- 4. Row-Level Security – admin only via service role
-- =============================================================================
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
-- No anon/auth.users policies. Service role key bypasses RLS.

-- =============================================================================
-- 5. Supabase Storage – proofs bucket (for income proof files)
-- =============================================================================
-- Reuse the 'receipts' bucket from expenses if already created, OR create 'proofs'.
-- Using a separate 'proofs' bucket keeps income files isolated.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proofs',
  'proofs',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;
