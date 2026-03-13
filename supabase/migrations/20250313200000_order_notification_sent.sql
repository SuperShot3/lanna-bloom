-- Idempotency for admin "new order" notifications: one email per order.
CREATE TABLE IF NOT EXISTS public.order_notification_sent (
  order_id text NOT NULL,
  notification_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (order_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_order_notification_sent_created_at
  ON public.order_notification_sent(created_at DESC);

COMMENT ON TABLE public.order_notification_sent IS 'Tracks sent notifications per order to prevent duplicate emails (e.g. admin_new_order).';
