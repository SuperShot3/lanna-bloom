-- Remove deprecated LINE automation schema after contact-only migration.
-- Safe re-run: each statement uses IF EXISTS.

-- Drop queue/draft/event tables used by deprecated agent + handoff flows.
DROP TABLE IF EXISTS public.line_agent_payment_notifications;
DROP TABLE IF EXISTS public.line_order_drafts;
DROP TABLE IF EXISTS public.line_integration_events;

-- Drop LINE automation columns from orders.
DROP INDEX IF EXISTS public.idx_orders_line_user_id;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS line_user_id,
  DROP COLUMN IF EXISTS order_source,
  DROP COLUMN IF EXISTS last_line_push_status,
  DROP COLUMN IF EXISTS last_line_push_at;
