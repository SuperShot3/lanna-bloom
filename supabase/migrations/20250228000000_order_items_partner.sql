-- Add columns for partner product cost/commission tracking
-- Run in Supabase SQL Editor

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'bouquet';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS cost numeric(12,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2);
