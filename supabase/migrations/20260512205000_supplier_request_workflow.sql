-- Supplier request workflow: private admin-generated shop links and supplier responses.

CREATE TABLE IF NOT EXISTS public.supplier_order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  shop_id text NOT NULL,
  shop_name_snapshot text NOT NULL,
  public_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'LINK_CREATED',
  product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  preparation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  pickup_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_card_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  supplier_response_type text,
  supplier_price numeric(12,2),
  supplier_ready_time text,
  supplier_reason text,
  supplier_notes text,
  opened_at timestamptz,
  responded_at timestamptz,
  approved_at timestamptz,
  disabled_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by_admin_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_requests_status_check CHECK (status IN (
    'LINK_CREATED',
    'LINK_SENT',
    'LINK_OPENED',
    'WAITING_RESPONSE',
    'ACCEPTED',
    'ACCEPTED_WITH_CHANGES',
    'DECLINED',
    'APPROVED',
    'DISABLED',
    'EXPIRED'
  )),
  CONSTRAINT supplier_order_requests_response_type_check CHECK (
    supplier_response_type IS NULL OR supplier_response_type IN (
      'PREPARE',
      'PREPARE_WITH_CHANGES',
      'DECLINE'
    )
  ),
  CONSTRAINT supplier_order_requests_price_check CHECK (
    supplier_price IS NULL OR supplier_price >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.supplier_order_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.supplier_order_requests(id) ON DELETE CASCADE,
  order_id text NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_message text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmed_supplier_request_id uuid REFERENCES public.supplier_order_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_shop_id text,
  ADD COLUMN IF NOT EXISTS confirmed_supplier_shop_name text,
  ADD COLUMN IF NOT EXISTS confirmed_supplier_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS confirmed_supplier_ready_time text,
  ADD COLUMN IF NOT EXISTS confirmed_supplier_confirmed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_supplier_order_requests_order_id
  ON public.supplier_order_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_supplier_order_requests_public_token
  ON public.supplier_order_requests(public_token);

CREATE INDEX IF NOT EXISTS idx_supplier_order_requests_status
  ON public.supplier_order_requests(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_order_requests_one_active_per_order
  ON public.supplier_order_requests(order_id)
  WHERE status IN ('LINK_CREATED', 'LINK_SENT', 'LINK_OPENED', 'WAITING_RESPONSE');

CREATE INDEX IF NOT EXISTS idx_supplier_order_request_events_request_id_created_at
  ON public.supplier_order_request_events(request_id, created_at);

CREATE INDEX IF NOT EXISTS idx_supplier_order_request_events_order_id_created_at
  ON public.supplier_order_request_events(order_id, created_at);

CREATE OR REPLACE FUNCTION public.set_supplier_order_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS supplier_order_requests_updated_at ON public.supplier_order_requests;
CREATE TRIGGER supplier_order_requests_updated_at
  BEFORE UPDATE ON public.supplier_order_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_supplier_order_requests_updated_at();

ALTER TABLE public.supplier_order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_order_request_events ENABLE ROW LEVEL SECURITY;
