-- Delivery area check requests from checkout (service-role only).

create table public.delivery_location_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new', 'replied', 'closed')),
  lang text not null default 'en',
  location_text text,
  google_maps_url text,
  customer_name text not null,
  customer_phone text,
  customer_email text not null,
  consent_accepted_at timestamptz not null,
  shared_cart_token text,
  shared_cart_url text,
  cart_items_json jsonb,
  submission_channel text not null default 'form'
    check (submission_channel in ('form', 'whatsapp', 'facebook', 'line')),
  source_path text,
  user_agent text,
  constraint delivery_location_requests_location_required check (
    (location_text is not null and btrim(location_text) <> '')
    or (google_maps_url is not null and btrim(google_maps_url) <> '')
  )
);

create index idx_delivery_location_requests_created_at
  on public.delivery_location_requests (created_at desc);

create index idx_delivery_location_requests_status
  on public.delivery_location_requests (status)
  where status = 'new';

alter table public.delivery_location_requests enable row level security;

revoke all on table public.delivery_location_requests from anon, authenticated;
grant select, insert, update, delete on table public.delivery_location_requests to service_role;

comment on table public.delivery_location_requests is
  'Customer delivery-area check requests from checkout when district/zone is not listed.';
