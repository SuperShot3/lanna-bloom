-- Short bilingual intro under the bouquet title on the PDP.
-- Distinct from description_* (Product introduction) and composition_* (Arrangement details).
-- Leave empty until copy is written. Hidden on the PDP when empty. Never truncated.

ALTER TABLE public.catalog_bouquets
  ADD COLUMN IF NOT EXISTS title_intro_en text,
  ADD COLUMN IF NOT EXISTS title_intro_th text;

COMMENT ON COLUMN public.catalog_bouquets.title_intro_en IS
  'Optional 3–5 line intro under the bouquet name (English). Unique from description and composition. Hidden on the PDP when empty.';
COMMENT ON COLUMN public.catalog_bouquets.title_intro_th IS
  'Optional 3–5 line intro under the bouquet name (Thai). Unique from description and composition. Hidden on the PDP when empty.';
