-- Главная страница канала: до 12 настраиваемых рядов (видео канала или плейлист), в духе YouTube.

create table if not exists public.channel_home_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  position smallint not null,
  section_kind text not null check (section_kind in ('uploads', 'playlist')),
  playlist_id uuid references public.playlists(id) on delete cascade,
  display_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_home_sections_position_range check (position >= 0 and position < 12),
  constraint channel_home_sections_playlist_fk check (
    (section_kind = 'playlist' and playlist_id is not null)
    or (section_kind = 'uploads' and playlist_id is null)
  ),
  unique (user_id, position)
);

create index if not exists channel_home_sections_user_position_idx
  on public.channel_home_sections (user_id, position);

alter table public.channel_home_sections enable row level security;

drop policy if exists channel_home_sections_select_all on public.channel_home_sections;
create policy channel_home_sections_select_all
  on public.channel_home_sections for select
  using (true);

drop policy if exists channel_home_sections_owner_all on public.channel_home_sections;
create policy channel_home_sections_owner_all
  on public.channel_home_sections for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
