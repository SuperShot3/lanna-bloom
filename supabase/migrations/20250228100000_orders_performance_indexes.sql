-- Performance indexes for orders table
-- Speeds up admin filters, order lookup, and list sorting

-- Sort by created_at (most common)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- Filter by district and delivery date
CREATE INDEX IF NOT EXISTS idx_orders_district ON public.orders(district);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);

-- order_items and order_status_history: foreign key lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- Enable pg_trgm for ilike search on order_id, phone, recipient_phone
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for ilike('%...%') on text columns
CREATE INDEX IF NOT EXISTS idx_orders_order_id_trgm ON public.orders USING gin(order_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_phone_trgm ON public.orders USING gin(phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_recipient_phone_trgm ON public.orders USING gin(recipient_phone gin_trgm_ops);
