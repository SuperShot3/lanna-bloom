-- Revert driver delivery platform (undoes 20260519120000_driver_platform.sql if applied).
-- Run in Supabase SQL Editor (or: supabase db push) on the project where the driver migration ran.
--
-- Keeps existing order fields: driver_name, driver_phone, delivery_google_maps_url.
-- Does NOT remove auth.users created via driver LINE signup — delete those manually in
-- Authentication → Users if needed.

-- -----------------------------------------------------------------------------
-- orders: driver RLS policies + driver_id column
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_driver_read" ON public.orders;
DROP POLICY IF EXISTS "orders_driver_update_assigned" ON public.orders;
DROP POLICY IF EXISTS "orders_driver_claim" ON public.orders;

DROP INDEX IF EXISTS public.idx_orders_driver_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS driver_id;

-- -----------------------------------------------------------------------------
-- drivers
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "drivers_select_own" ON public.drivers;
DROP TRIGGER IF EXISTS drivers_updated_at ON public.drivers;
DROP TABLE IF EXISTS public.drivers;

-- -----------------------------------------------------------------------------
-- driver_invites
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.driver_invites;

-- -----------------------------------------------------------------------------
-- helpers
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.current_driver_id();
DROP FUNCTION IF EXISTS public.update_drivers_updated_at();
