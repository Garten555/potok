alter table public.playlists enable row level security;
alter table public.playlist_videos enable row level security;

drop policy if exists playlists_select_public_or_owner on public.playlists;
create policy playlists_select_public_or_owner on public.playlists
for select
using (
  (is_system = false and visibility in ('public', 'unlisted'))
  or auth.uid() = user_id
);

drop policy if exists playlists_insert_owner on public.playlists;
create policy playlists_insert_owner on public.playlists
for insert
with check (
  auth.uid() = user_id
  and (is_system = false or system_key is not null)
);

drop policy if exists playlists_update_owner on public.playlists;
create policy playlists_update_owner on public.playlists
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists playlists_delete_owner on public.playlists;
create policy playlists_delete_owner on public.playlists
for delete
using (auth.uid() = user_id);

drop policy if exists playlist_videos_select_by_playlist_visibility on public.playlist_videos;
create policy playlist_videos_select_by_playlist_visibility on public.playlist_videos
for select
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and (
        (p.is_system = false and p.visibility in ('public', 'unlisted'))
        or p.user_id = auth.uid()
      )
  )
);

drop policy if exists playlist_videos_insert_playlist_owner on public.playlist_videos;
create policy playlist_videos_insert_playlist_owner on public.playlist_videos
for insert
with check (
  exists (
    select 1
    from public.playlists p
    join public.videos v on v.id = video_id
    where p.id = playlist_id
      and p.user_id = auth.uid()
      and (
        p.kind <> 'channel'
        or v.user_id = p.user_id
      )
  )
);

drop policy if exists playlist_videos_update_playlist_owner on public.playlist_videos;
create policy playlist_videos_update_playlist_owner on public.playlist_videos
for update
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.playlists p
    join public.videos v on v.id = video_id
    where p.id = playlist_id
      and p.user_id = auth.uid()
      and (
        p.kind <> 'channel'
        or v.user_id = p.user_id
      )
  )
);

drop policy if exists playlist_videos_delete_playlist_owner on public.playlist_videos;
create policy playlist_videos_delete_playlist_owner on public.playlist_videos
for delete
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.user_id = auth.uid()
  )
);
