-- Feature 2 — Partner ↔ province linking (metadata/filter only; no order auto-assign)
-- Depends on: 20260803120000_provinces.sql

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS province_code text REFERENCES public.provinces(province_code);

ALTER TABLE public.catalog_partners
  ADD COLUMN IF NOT EXISTS province_code text REFERENCES public.provinces(province_code);

CREATE INDEX IF NOT EXISTS partner_applications_province_code_idx
  ON public.partner_applications (province_code);

CREATE INDEX IF NOT EXISTS catalog_partners_province_code_idx
  ON public.catalog_partners (province_code);

-- Existing partners/applications are Chiang Mai-based.
UPDATE public.partner_applications
SET province_code = 'chiang-mai'
WHERE province_code IS NULL;

UPDATE public.catalog_partners
SET province_code = 'chiang-mai'
WHERE province_code IS NULL;

-- Simplified public apply form no longer guarantees contact_name / email / phone;
-- validated at the application layer (at least one contact method).
ALTER TABLE public.partner_applications
  ALTER COLUMN contact_name DROP NOT NULL;

ALTER TABLE public.partner_applications
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.partner_applications
  ALTER COLUMN phone DROP NOT NULL;
