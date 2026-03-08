-- Newsletter subscribers table. Stores emails from footer signup and other sources.
-- Used for MVP: store emails in Supabase and notify business via Resend.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Email stored in lowercase for case-insensitive uniqueness
  email text NOT NULL,
  -- Source of signup (e.g. 'footer', 'popup', 'checkout')
  source text NOT NULL DEFAULT 'footer',
  -- Status: active, unsubscribed, etc.
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);

-- Ensure email is lowercase on insert/update
CREATE OR REPLACE FUNCTION newsletter_subscribers_lowercase_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_subscribers_lowercase_email_trigger
  BEFORE INSERT OR UPDATE ON public.newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION newsletter_subscribers_lowercase_email();

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at ON public.newsletter_subscribers(created_at DESC);

-- RLS: public can insert (signup); admin uses service role for reads
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin reads via service role (bypasses RLS)

COMMENT ON TABLE public.newsletter_subscribers IS 'Newsletter signup emails from footer and other sources';
COMMENT ON COLUMN public.newsletter_subscribers.email IS 'Subscriber email, stored lowercase';
COMMENT ON COLUMN public.newsletter_subscribers.source IS 'Signup source (footer, popup, etc.)';
COMMENT ON COLUMN public.newsletter_subscribers.status IS 'active, unsubscribed, etc.';
