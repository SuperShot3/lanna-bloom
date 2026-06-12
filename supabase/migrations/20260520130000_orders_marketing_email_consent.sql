-- Optional checkout consent for promotional email and Trustpilot review invitations (BCC).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS marketing_email_consent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.marketing_email_consent IS
  'Customer opted in at checkout to offers and review-invitation email (e.g. Trustpilot BCC on delivered email).';
