-- Explicit opt-in + unsubscribe token for abandoned checkout recovery emails.

alter table public.checkout_abandonments
  add column if not exists recovery_email_consent boolean not null default false,
  add column if not exists recovery_unsubscribe_token text unique;

create table if not exists public.checkout_recovery_email_opt_outs (
  email text primary key,
  opted_out_at timestamptz not null default now()
);

alter table public.checkout_recovery_email_opt_outs enable row level security;

revoke all on table public.checkout_recovery_email_opt_outs from anon, authenticated;
grant select, insert, update, delete on table public.checkout_recovery_email_opt_outs to service_role;

comment on column public.checkout_abandonments.recovery_email_consent is
  'Snapshot of customer opt-in at schedule time; cron skips send when false.';
comment on column public.checkout_abandonments.recovery_unsubscribe_token is
  'One-click opt-out token included in recovery email footer.';
comment on table public.checkout_recovery_email_opt_outs is
  'Global opt-out by email — prevents future abandoned-checkout recovery sends.';
