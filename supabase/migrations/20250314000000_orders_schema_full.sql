-- Orders schema: single source of truth for Lanna Bloom.
-- Run in Supabase Dashboard → SQL Editor, or via: supabase db push
-- Idempotent: safe to run multiple times (CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS).
--
-- If you already have order_items without an "id" column, create it first or skip the
-- CREATE TABLE order_items block and add columns with ALTER only.

-- =============================================================================
-- 1. ORDERS table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  order_id text PRIMARY KEY,
  public_token text,
  payment_method text,
  customer_name text,
  customer_email text,
  phone text,
  address text,
  district text,
  delivery_window text,
  delivery_date text,
  order_status text DEFAULT 'NEW',
  payment_status text DEFAULT 'NOT_PAID',
  stripe_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  items_total numeric(12,2),
  delivery_fee numeric(12,2),
  grand_total numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  recipient_name text,
  recipient_phone text,
  contact_preference text,
  referral_code text,
  referral_discount numeric(12,2) DEFAULT 0,
  fulfillment_status text DEFAULT 'new',
  fulfillment_status_updated_at timestamptz DEFAULT now(),
  order_json jsonb,
  ga_client_id text,
  admin_notified boolean DEFAULT false,
  admin_notified_at timestamptz
);

-- Add any columns that might be missing (e.g. if table was created before these existed)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_json jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'new';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status_updated_at timestamptz DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga_client_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notified boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

-- =============================================================================
-- 2. ORDER_ITEMS table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  bouquet_id text,
  bouquet_title text,
  size text,
  price numeric(12,2),
  image_url_snapshot text,
  item_type text DEFAULT 'bouquet',
  cost numeric(12,2),
  commission_amount numeric(12,2)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'bouquet';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS cost numeric(12,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2);

-- =============================================================================
-- 3. ORDER_STATUS_HISTORY table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  from_status text,
  to_status text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- =============================================================================
-- 4. Indexes (if not already present from other migrations)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_district ON public.orders(district);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
