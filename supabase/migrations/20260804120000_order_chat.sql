-- Temporary order chat (service-role only). Soft-closed 2h after DELIVERED, then hard-deleted by cron.

create table public.order_chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (order_id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'admin')),
  body text not null,
  created_at timestamptz not null default now(),
  constraint order_chat_messages_body_len check (char_length(body) >= 1 and char_length(body) <= 2000)
);

create index idx_order_chat_messages_order_created
  on public.order_chat_messages (order_id, created_at);

create table public.order_chat_admin_state (
  order_id text primary key references public.orders (order_id) on delete cascade,
  last_read_at timestamptz,
  purge_after timestamptz,
  updated_at timestamptz not null default now()
);

create index idx_order_chat_admin_state_purge_after
  on public.order_chat_admin_state (purge_after)
  where purge_after is not null;

-- Unread aggregation: customer messages newer than last_read_at for non-purged threads
create index idx_order_chat_messages_unread_customer
  on public.order_chat_messages (order_id, created_at)
  where sender_type = 'customer';

alter table public.order_chat_messages enable row level security;
alter table public.order_chat_admin_state enable row level security;

revoke all on table public.order_chat_messages from anon, authenticated;
revoke all on table public.order_chat_admin_state from anon, authenticated;

grant select, insert, update, delete on table public.order_chat_messages to service_role;
grant select, insert, update, delete on table public.order_chat_admin_state to service_role;
