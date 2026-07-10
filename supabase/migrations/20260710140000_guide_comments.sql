-- Guide article comments and helpful reactions (backend-only via service role).

create table public.guide_comments (
  id uuid primary key default gen_random_uuid(),
  guide_slug text not null,
  author_name text not null,
  author_email text,
  body text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'hidden')),
  locale text not null default 'en',
  visitor_token_hash text not null,
  created_at timestamptz not null default now()
);

create index idx_guide_comments_guide_slug on public.guide_comments (guide_slug);
create index idx_guide_comments_status on public.guide_comments (status);
create index idx_guide_comments_created_at on public.guide_comments (created_at desc);
create index idx_guide_comments_slug_status_created on public.guide_comments (guide_slug, status, created_at desc);

create table public.guide_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.guide_comments (id) on delete cascade,
  visitor_token_hash text not null,
  created_at timestamptz not null default now(),
  unique (comment_id, visitor_token_hash)
);

create index idx_guide_comment_reactions_comment_id on public.guide_comment_reactions (comment_id);

alter table public.guide_comments enable row level security;
alter table public.guide_comment_reactions enable row level security;

revoke all on table public.guide_comments from anon, authenticated;
revoke all on table public.guide_comment_reactions from anon, authenticated;

grant select, insert, update, delete on table public.guide_comments to service_role;
grant select, insert, update, delete on table public.guide_comment_reactions to service_role;
