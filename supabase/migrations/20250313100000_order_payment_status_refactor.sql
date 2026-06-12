-- Refactor to 2 backend status fields: order_status and payment_status.
-- Deprecate fulfillment_status (column kept for backward compat; customer text derived from order_status).

-- Map existing order_status to new enum: NEW, PROCESSING, READY_TO_DISPATCH, DISPATCHED, DELIVERED, CANCELLED
UPDATE public.orders
SET order_status = CASE
  WHEN order_status IS NULL THEN 'NEW'
  WHEN order_status IN ('PAID', 'ACCEPTED', 'PREPARING') THEN 'PROCESSING'
  WHEN order_status = 'READY_FOR_DISPATCH' THEN 'READY_TO_DISPATCH'
  WHEN order_status IN ('OUT_FOR_DELIVERY', 'DISPATCHED') THEN 'DISPATCHED'
  WHEN order_status = 'DELIVERED' THEN 'DELIVERED'
  WHEN order_status IN ('CANCELED', 'CANCELLED', 'REFUNDED') THEN 'CANCELLED'
  WHEN order_status IN ('NEW', 'PROCESSING', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CANCELLED') THEN order_status
  ELSE 'NEW'
END
WHERE order_status IS DISTINCT FROM CASE
  WHEN order_status IS NULL THEN 'NEW'
  WHEN order_status IN ('PAID', 'ACCEPTED', 'PREPARING') THEN 'PROCESSING'
  WHEN order_status = 'READY_FOR_DISPATCH' THEN 'READY_TO_DISPATCH'
  WHEN order_status IN ('OUT_FOR_DELIVERY', 'DISPATCHED') THEN 'DISPATCHED'
  WHEN order_status = 'DELIVERED' THEN 'DELIVERED'
  WHEN order_status IN ('CANCELED', 'CANCELLED', 'REFUNDED') THEN 'CANCELLED'
  WHEN order_status IN ('NEW', 'PROCESSING', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CANCELLED') THEN order_status
  ELSE 'NEW'
END;

-- Map existing payment_status to new enum: NOT_PAID, PAID, CANCELLED, ERROR
UPDATE public.orders
SET payment_status = CASE
  WHEN payment_status IS NULL THEN 'NOT_PAID'
  WHEN payment_status IN ('PENDING') THEN 'NOT_PAID'
  WHEN payment_status = 'PAID' THEN 'PAID'
  WHEN payment_status IN ('FAILED') THEN 'ERROR'
  WHEN payment_status IN ('CANCELLED', 'ERROR', 'NOT_PAID') THEN payment_status
  ELSE 'NOT_PAID'
END
WHERE payment_status IS DISTINCT FROM CASE
  WHEN payment_status IS NULL THEN 'NOT_PAID'
  WHEN payment_status IN ('PENDING') THEN 'NOT_PAID'
  WHEN payment_status = 'PAID' THEN 'PAID'
  WHEN payment_status IN ('FAILED') THEN 'ERROR'
  WHEN payment_status IN ('CANCELLED', 'ERROR', 'NOT_PAID') THEN payment_status
  ELSE 'NOT_PAID'
END;

-- Ensure defaults for new rows
ALTER TABLE public.orders
  ALTER COLUMN order_status SET DEFAULT 'NEW',
  ALTER COLUMN payment_status SET DEFAULT 'NOT_PAID';
