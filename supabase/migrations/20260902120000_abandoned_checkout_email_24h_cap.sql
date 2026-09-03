-- Cap abandoned-checkout recovery emails at 1 per customer email per 24 hours.

create table public.checkout_recovery_email_rate_limits (
  email text primary key,
  last_sent_at timestamptz not null,
  abandonment_id uuid
);

alter table public.checkout_recovery_email_rate_limits enable row level security;

revoke all on table public.checkout_recovery_email_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.checkout_recovery_email_rate_limits to service_role;

comment on table public.checkout_recovery_email_rate_limits is
  'Atomic per-email lock so abandoned-checkout recovery sends at most once per 24 hours.';

create index if not exists idx_checkout_abandonments_customer_email
  on public.checkout_abandonments (customer_email);
