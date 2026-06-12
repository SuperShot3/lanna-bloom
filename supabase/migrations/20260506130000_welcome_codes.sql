-- Welcome codes for newsletter subscribers (unique, single-use promo codes).
-- Stored in Supabase so the server can validate + redeem codes securely.

CREATE TABLE IF NOT EXISTS public.welcome_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Full code string, e.g. 'WELCOME10-7K4D2P'
  code text NOT NULL,
  -- Subscriber email (stored lowercase for consistency)
  email text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Expiry window for welcome promo codes.
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  redeemed_at timestamptz,
  redeemed_order_id text,
  CONSTRAINT welcome_codes_code_unique UNIQUE (code),
  CONSTRAINT welcome_codes_discount_type_check CHECK (discount_type IN ('percent', 'fixed', 'free_delivery')),
  CONSTRAINT welcome_codes_discount_value_check CHECK (discount_value >= 0)
);

-- Ensure email is lowercase on insert/update
CREATE OR REPLACE FUNCTION welcome_codes_lowercase_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  NEW.code := upper(trim(NEW.code));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS welcome_codes_lowercase_email_trigger ON public.welcome_codes;
CREATE TRIGGER welcome_codes_lowercase_email_trigger
  BEFORE INSERT OR UPDATE ON public.welcome_codes
  FOR EACH ROW
  EXECUTE FUNCTION welcome_codes_lowercase_email();

CREATE INDEX IF NOT EXISTS idx_welcome_codes_code ON public.welcome_codes(code);
CREATE INDEX IF NOT EXISTS idx_welcome_codes_email ON public.welcome_codes(email);
CREATE INDEX IF NOT EXISTS idx_welcome_codes_created_at ON public.welcome_codes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_welcome_codes_redeemed_at ON public.welcome_codes(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_welcome_codes_expires_at ON public.welcome_codes(expires_at);

-- RLS: service role only (no public policies)
ALTER TABLE public.welcome_codes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.welcome_codes IS 'Unique welcome promo codes for newsletter subscribers; validated server-side and single-use via redeemed_at.';
COMMENT ON COLUMN public.welcome_codes.code IS 'Unique promo code (uppercase).';
COMMENT ON COLUMN public.welcome_codes.email IS 'Subscriber email (lowercase).';
COMMENT ON COLUMN public.welcome_codes.discount_type IS 'percent, fixed, free_delivery.';
COMMENT ON COLUMN public.welcome_codes.discount_value IS 'Percent or fixed amount (type-dependent).';
COMMENT ON COLUMN public.welcome_codes.redeemed_at IS 'Set when code is redeemed on a paid order.';
