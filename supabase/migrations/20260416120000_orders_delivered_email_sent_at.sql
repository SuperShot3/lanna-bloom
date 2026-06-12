-- One post-delivery customer email per order (idempotent via delivered_email_sent_at).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_email_sent_at timestamptz;

COMMENT ON COLUMN public.orders.delivered_email_sent_at IS
  'Set when the post-delivery thank-you/review email was successfully claimed for sending; null means not sent yet.';
