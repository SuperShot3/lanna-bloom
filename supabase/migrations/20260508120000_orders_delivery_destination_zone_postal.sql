-- Province expansion: canonical delivery geography + inferred postcode (storage only; fee uses destination + zone).

alter table public.orders
  add column if not exists delivery_destination text,
  add column if not exists delivery_zone text,
  add column if not exists postal_code text;

create index if not exists orders_delivery_destination_idx
  on public.orders (delivery_destination)
  where delivery_destination is not null;

comment on column public.orders.delivery_destination is 'Canonical market id e.g. CHIANG_MAI, PHUKET';
comment on column public.orders.delivery_zone is 'Stable zone id from lib/delivery/zones.ts';
comment on column public.orders.postal_code is '5-digit Thai postcode inferred server-side when possible';
