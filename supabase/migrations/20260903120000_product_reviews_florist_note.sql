-- Product-specific reviews (bouquet PDP) + optional bilingual florist/team notes.
-- Reviews start empty. Do not backfill Google or shop-global ratings.

ALTER TABLE public.catalog_bouquets
  ADD COLUMN IF NOT EXISTS florist_note_en text,
  ADD COLUMN IF NOT EXISTS florist_note_th text;

COMMENT ON COLUMN public.catalog_bouquets.florist_note_en IS
  'Optional short human-written team/florist note (English). Hidden on the PDP when empty.';
COMMENT ON COLUMN public.catalog_bouquets.florist_note_th IS
  'Optional short human-written team/florist note (Thai). Hidden on the PDP when empty.';

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bouquet_id uuid NOT NULL REFERENCES public.catalog_bouquets (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL,
  locale text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_reviews_bouquet_status_created
  ON public.product_reviews (bouquet_id, status, created_at DESC);

CREATE INDEX idx_product_reviews_status
  ON public.product_reviews (status);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_reviews FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_reviews TO service_role;
