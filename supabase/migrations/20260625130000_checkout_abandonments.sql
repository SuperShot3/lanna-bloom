-- Abandoned cart checkout snapshots for recovery emails (service-role only).

create table public.checkout_abandonments (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  checkout_draft_id uuid,
  submission_token text,
  recovery_token text not null unique,
  customer_email text not null,
  customer_name text,
  lang text not null default 'en',
  payload_json jsonb not null,
  session_created_at timestamptz not null default now(),
  recovery_email_scheduled_for timestamptz not null,
  recovery_email_sent_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null
);

create index idx_checkout_abandonments_due
  on public.checkout_abandonments (recovery_email_scheduled_for)
  where recovery_email_sent_at is null and cancelled_at is null;

create index idx_checkout_abandonments_recovery_token
  on public.checkout_abandonments (recovery_token);

create index idx_checkout_abandonments_expires_at
  on public.checkout_abandonments (expires_at);

alter table public.checkout_abandonments enable row level security;

revoke all on table public.checkout_abandonments from anon, authenticated;
grant select, insert, update, delete on table public.checkout_abandonments to service_role;

comment on table public.checkout_abandonments is
  'Cart checkout abandonment snapshots for 3h recovery email + full cart/form restore links.';
