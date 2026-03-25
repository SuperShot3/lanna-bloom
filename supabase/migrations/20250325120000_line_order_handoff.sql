-- LINE OA handoff MVP: temporary drafts, integration audit, order linkage fields.
-- Idempotent: safe to re-run.

-- -----------------------------------------------------------------------------
-- Temporary server-side drafts (not real orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.line_order_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL UNIQUE,
  draft_json jsonb NOT NULL DEFAULT '{}',
  handoff_token text UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_order_drafts_expires_at ON public.line_order_drafts (expires_at);
CREATE INDEX IF NOT EXISTS idx_line_order_drafts_handoff_token ON public.line_order_drafts (handoff_token);

-- -----------------------------------------------------------------------------
-- Minimal audit log for LINE integration events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.line_integration_events (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  line_user_id text,
  order_id text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_integration_events_type ON public.line_integration_events (event_type);
CREATE INDEX IF NOT EXISTS idx_line_integration_events_created ON public.line_integration_events (created_at DESC);

-- -----------------------------------------------------------------------------
-- Orders: LINE source + linkage + last push (additive)
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS line_user_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_source text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_line_push_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_line_push_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_line_user_id ON public.orders (line_user_id) WHERE line_user_id IS NOT NULL;

COMMENT ON COLUMN public.orders.line_user_id IS 'LINE Messaging API user id when order originated from LINE handoff';
COMMENT ON COLUMN public.orders.order_source IS 'e.g. line, web';
COMMENT ON COLUMN public.orders.last_line_push_status IS 'success | failed | skipped';
COMMENT ON COLUMN public.orders.last_line_push_at IS 'Last payment-confirmation LINE push attempt';
