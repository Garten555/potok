create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  kind text not null default 'user' check (kind in ('channel', 'user')),
  is_system boolean not null default false,
  system_key text,
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  created_at timestamptz not null default now(),
  constraint playlists_system_key_chk check (
    system_key is null or system_key in ('watch_later')
  ),
  constraint playlists_system_kind_chk check (
    (is_system = true and kind = 'user')
    or is_system = false
  )
);

create table if not exists public.playlist_videos (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (playlist_id, video_id)
);

create index if not exists playlists_user_created_idx
on public.playlists(user_id, created_at desc);

create index if not exists playlists_user_kind_created_idx
on public.playlists(user_id, kind, created_at desc);

create unique index if not exists playlists_user_system_key_uidx
on public.playlists(user_id, system_key)
where system_key is not null;

create unique index if not exists playlist_videos_playlist_position_uidx
on public.playlist_videos(playlist_id, position);

create index if not exists playlist_videos_video_idx
on public.playlist_videos(video_id);
