-- One admin "new order" email per order, sent only at placement (not when marked paid).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notified boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

COMMENT ON COLUMN public.orders.admin_notified IS 'True after admin was notified once at order creation (prevents duplicate new-order emails)';
COMMENT ON COLUMN public.orders.admin_notified_at IS 'When the single admin new-order notification was sent';
