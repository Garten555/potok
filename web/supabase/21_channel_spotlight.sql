-- Заголовок блока «другие каналы» на главной; сами ссылки — в channel_spotlight_links.
alter table public.users
  add column if not exists channel_spotlight_title text;

comment on column public.users.channel_spotlight_title is 'Заголовок ряда продвижения других каналов (напр. «Мои друзья»).';

create table if not exists public.channel_spotlight_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  position smallint not null check (position >= 0 and position < 24),
  target_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, position),
  unique (owner_id, target_user_id),
  constraint channel_spotlight_not_self check (owner_id <> target_user_id)
);

create index if not exists channel_spotlight_links_owner_idx
  on public.channel_spotlight_links (owner_id, position);

alter table public.channel_spotlight_links enable row level security;

drop policy if exists channel_spotlight_links_select_all on public.channel_spotlight_links;
create policy channel_spotlight_links_select_all
  on public.channel_spotlight_links for select
  using (true);

drop policy if exists channel_spotlight_links_owner_all on public.channel_spotlight_links;
create policy channel_spotlight_links_owner_all
  on public.channel_spotlight_links for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
