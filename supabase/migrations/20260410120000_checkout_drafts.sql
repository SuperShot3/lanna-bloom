-- Pending checkout payloads: order is created only after Stripe payment succeeds.
create table if not exists public.checkout_drafts (
  id uuid primary key default gen_random_uuid(),
  submission_token text not null unique,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checkout_drafts_updated_at on public.checkout_drafts(updated_at desc);
