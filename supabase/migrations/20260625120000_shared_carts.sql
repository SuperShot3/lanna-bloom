-- Shared cart snapshots: items-only links for staff/customers (backend-only via service role).

create table public.shared_carts (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  items_json jsonb not null,
  locale text not null default 'en',
  expires_at timestamptz not null default (now() + interval '3 days'),
  created_at timestamptz not null default now()
);

create index idx_shared_carts_expires_at on public.shared_carts(expires_at);

alter table public.shared_carts enable row level security;

revoke all on table public.shared_carts from anon, authenticated;
grant select, insert, update, delete on table public.shared_carts to service_role;
