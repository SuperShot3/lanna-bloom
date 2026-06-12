-- Store temp password for approved partners (admin-only, for password recovery)
ALTER TABLE public.partner_applications
ADD COLUMN IF NOT EXISTS temp_password text;
