-- Harden sensitive data exposure with row-level security.
-- Customer self-service reads are allowed only when request carries matching x-order-token.
-- Backend service-role access continues to work (service role bypasses RLS).

-- -----------------------------------------------------------------------------
-- Helper: read order token from request headers (PostgREST/Supabase context)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_order_token()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    BTRIM(COALESCE((current_setting('request.headers', true)::jsonb ->> 'x-order-token'), '')),
    ''
  );
$$;

COMMENT ON FUNCTION public.request_order_token() IS
  'Returns x-order-token from request headers for token-scoped customer read policies.';

-- -----------------------------------------------------------------------------
-- Primary customer-sensitive order tables: enable RLS + token-scoped read policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_token_scoped_read" ON public.orders;
CREATE POLICY "orders_token_scoped_read"
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (
    public_token IS NOT NULL
    AND public_token = public.request_order_token()
  );

DROP POLICY IF EXISTS "order_items_token_scoped_read" ON public.order_items;
CREATE POLICY "order_items_token_scoped_read"
  ON public.order_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.order_id = order_items.order_id
        AND o.public_token IS NOT NULL
        AND o.public_token = public.request_order_token()
    )
  );

DROP POLICY IF EXISTS "order_status_history_token_scoped_read" ON public.order_status_history;
CREATE POLICY "order_status_history_token_scoped_read"
  ON public.order_status_history
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.order_id = order_status_history.order_id
        AND o.public_token IS NOT NULL
        AND o.public_token = public.request_order_token()
    )
  );

-- -----------------------------------------------------------------------------
-- Adjacent sensitive/operational tables: enable RLS with no anon/auth policies.
-- This keeps them private unless accessed by service-role trusted backend.
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.line_order_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.line_integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.line_agent_payment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_notification_sent ENABLE ROW LEVEL SECURITY;
