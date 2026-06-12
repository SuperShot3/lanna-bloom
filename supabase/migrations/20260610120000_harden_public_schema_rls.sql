-- Harden public schema: enable RLS on every table that lacks it.
-- Fixes Supabase Security Advisor "rls_disabled_in_public" (critical).
--
-- Safe to re-run: ENABLE ROW LEVEL SECURITY is idempotent; REVOKE/GRANT are idempotent.
-- Service role bypasses RLS. Tables with intentional anon policies are unchanged.

-- -----------------------------------------------------------------------------
-- 1. Catch-all: any public table still missing RLS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Enabled RLS on public.%', r.tablename;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Explicit backend-only tables (defense in depth: revoke anon/auth, grant service_role)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'checkout_drafts',
    'email_templates',
    'email_outbox',
    'customer_reminders',
    'reminder_email_logs',
    'admin_users',
    'audit_logs',
    'stripe_events',
    'line_order_drafts',
    'line_integration_events',
    'line_agent_payment_notifications',
    'order_notification_sent',
    'expenses',
    'income_records',
    'accounting_transfers',
    'expense_receipt_images',
    'welcome_codes',
    'income_refunds',
    'supplier_order_requests',
    'supplier_order_request_events',
    'catalog_partners',
    'catalog_bouquets',
    'catalog_products',
    'catalog_site_settings',
    'catalog_slug_registry',
    'catalog_product_revisions',
    'catalog_product_images',
    'catalog_collections',
    'catalog_collection_items',
    'catalog_audit_events',
    'drivers',
    'driver_invites',
    'app_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',
        t
      );
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Order tables: RLS + token policies (re-assert if migration order was partial)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_status_history ENABLE ROW LEVEL SECURITY;
