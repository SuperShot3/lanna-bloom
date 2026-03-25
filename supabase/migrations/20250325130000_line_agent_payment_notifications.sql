-- Queued payment-confirmation payloads for the LINE agent (website does not call LINE API).
-- Agent polls GET /api/agent/line/pending-payment-notifications and sends push, then POST ack.

CREATE TABLE IF NOT EXISTS public.line_agent_payment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  line_user_id text NOT NULL,
  public_order_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_line_agent_pay_notif_pending
  ON public.line_agent_payment_notifications (created_at DESC)
  WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_line_agent_pay_notif_order_id
  ON public.line_agent_payment_notifications (order_id);

COMMENT ON TABLE public.line_agent_payment_notifications IS 'Payment-confirmed LINE messages to be sent by OpenClaw agent, not by the website.';
