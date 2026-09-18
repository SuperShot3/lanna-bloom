-- Customer Rewards (Phase 1): minimal customer identity anchor.
-- Not a parallel customer database — orders/newsletter_subscribers/customer_reminders
-- keep matching by normalized email as before. This table is the new anchor that
-- rewards (and later auth, profile fields, important dates) hang off of.

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stored lowercase for consistency with welcome_codes/newsletter_subscribers.
  email text NOT NULL,
  -- Linked on first magic-link sign-in by normalized-email match. Nullable because
  -- admins must be able to create/credit a customer before they ever sign in.
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  phone text,
  birthday date,
  anniversary date,
  marketing_email_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_email_unique UNIQUE (email),
  CONSTRAINT customers_auth_user_id_unique UNIQUE (auth_user_id)
);

CREATE OR REPLACE FUNCTION public.customers_lowercase_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_lowercase_email_trigger ON public.customers;
CREATE TRIGGER customers_lowercase_email_trigger
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.customers_lowercase_email();

CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customers_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers(auth_user_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- A customer may read only their own row once linked to an auth session.
-- No INSERT/UPDATE/DELETE policy for anon/authenticated at all — service role only.
DROP POLICY IF EXISTS "customers_self_read" ON public.customers;
CREATE POLICY "customers_self_read"
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Defense in depth: revoke the default anon/authenticated table grants and
-- re-grant only SELECT to authenticated (RLS narrows that further to own row).
REVOKE ALL ON TABLE public.customers FROM anon, authenticated;
GRANT SELECT ON TABLE public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO service_role;

COMMENT ON TABLE public.customers IS
  'Minimal customer identity anchor for rewards/auth. Not a parallel CRM — orders/newsletter_subscribers keep matching by email as before.';
COMMENT ON COLUMN public.customers.auth_user_id IS 'Linked on first magic-link sign-in; null until then.';
