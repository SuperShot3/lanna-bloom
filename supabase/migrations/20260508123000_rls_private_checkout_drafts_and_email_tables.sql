-- Ensure sensitive operational tables are protected by RLS.
-- These tables are intended for service-role backend access only (no anon/auth policies).

ALTER TABLE IF EXISTS public.checkout_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reminder_email_logs ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: revoke accidental broad grants for public roles.
REVOKE ALL ON TABLE public.checkout_drafts FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_templates FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_outbox FROM anon, authenticated;
REVOKE ALL ON TABLE public.customer_reminders FROM anon, authenticated;
REVOKE ALL ON TABLE public.reminder_email_logs FROM anon, authenticated;

