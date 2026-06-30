-- Email required for delivery location requests; phone optional.

alter table public.delivery_location_requests
  alter column customer_phone drop not null;

alter table public.delivery_location_requests
  alter column customer_email set not null;
