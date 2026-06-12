-- One payment-failed customer email per order (idempotent via payment_failed_email_sent_at).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_failed_email_sent_at timestamptz;

COMMENT ON COLUMN public.orders.payment_failed_email_sent_at IS
  'Set when the Stripe payment-failed customer email was successfully claimed for sending; null means not sent yet. Cleared if the send fails so a later retry can claim again.';
