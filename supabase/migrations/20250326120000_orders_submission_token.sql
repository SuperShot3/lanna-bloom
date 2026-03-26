-- Idempotent checkout: one order per submission token (browser-generated UUID).
-- Safe to run multiple times.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS submission_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_submission_token_unique
  ON public.orders (submission_token)
  WHERE submission_token IS NOT NULL;
