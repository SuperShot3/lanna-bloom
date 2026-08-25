-- Persist checkout form + gift messages on shared cart snapshots.
-- Items-only rows (legacy links) remain valid; new columns are nullable.

ALTER TABLE public.shared_carts
  ADD COLUMN IF NOT EXISTS form_json jsonb,
  ADD COLUMN IF NOT EXISTS gift_card_messages_json jsonb;

COMMENT ON COLUMN public.shared_carts.form_json IS
  'Optional RecoveredCartForm snapshot (destination, zone, address, contacts). Null on legacy item-only shares.';

COMMENT ON COLUMN public.shared_carts.gift_card_messages_json IS
  'Optional order-level gift card message strings (1–3). Null on legacy shares.';
