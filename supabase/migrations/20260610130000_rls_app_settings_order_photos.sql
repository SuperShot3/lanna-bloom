-- RLS for manually created tables: app_settings, order_photos
--
-- app_settings: internal config — service role only (never public Data API).
-- order_photos: customers may view their own order's photos, but only with a
-- valid order public_token (same pattern as orders / order_items).

-- -----------------------------------------------------------------------------
-- app_settings — admin/backend only
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.app_settings') IS NOT NULL THEN
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.app_settings FROM anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_settings TO service_role;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- order_photos — token-scoped customer read; writes via service role only
-- Assumes order_photos.order_id matches orders.order_id (text).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.order_photos') IS NOT NULL THEN
    ALTER TABLE public.order_photos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "order_photos_token_scoped_read" ON public.order_photos;
    CREATE POLICY "order_photos_token_scoped_read"
      ON public.order_photos
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.orders o
          WHERE o.order_id = order_photos.order_id
            AND o.public_token IS NOT NULL
            AND o.public_token = public.request_order_token()
        )
      );

    REVOKE INSERT, UPDATE, DELETE ON TABLE public.order_photos FROM anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_photos TO service_role;
  END IF;
END $$;
