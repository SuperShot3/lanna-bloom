-- Optional Google Maps share link, stored separately from street address.

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS google_maps_url text;
