-- Calling codes the customer selected at checkout (digits only, e.g. 66, 1, 44).
-- Used for admin display; full E.164-style number remains in phone / recipient_phone.

alter table public.orders
  add column if not exists phone_country_code text,
  add column if not exists recipient_phone_country_code text;

comment on column public.orders.phone_country_code is 'Customer phone ITU calling code digits from checkout (e.g. 66)';
comment on column public.orders.recipient_phone_country_code is 'Recipient phone ITU calling code digits when ordering for someone else';
