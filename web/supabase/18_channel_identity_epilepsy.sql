-- Лог смен channel_handle для лимита (3 за 30 дней)
create table if not exists public.channel_handle_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  old_handle text not null,
  new_handle text not null,
  created_at timestamptz not null default now()
);

create index if not exists channel_handle_changes_user_created_idx
  on public.channel_handle_changes (user_id, created_at desc);

alter table public.channel_handle_changes enable row level security;

drop policy if exists channel_handle_changes_select_self on public.channel_handle_changes;
create policy channel_handle_changes_select_self on public.channel_handle_changes
  for select using (auth.uid() = user_id);

drop policy if exists channel_handle_changes_insert_self on public.channel_handle_changes;
create policy channel_handle_changes_insert_self on public.channel_handle_changes
  for insert with check (auth.uid() = user_id);

-- Предупреждение о вспышках / фоточувствительности (эпилепсия)
alter table public.videos
  add column if not exists photosensitive_warning boolean not null default false;

comment on column public.videos.photosensitive_warning is 'Показывать предупреждение перед просмотром (вспышки, стробоскоп и т.п.)';
