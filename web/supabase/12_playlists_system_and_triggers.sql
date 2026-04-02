create or replace function public.enforce_playlist_video_ownership()
returns trigger
language plpgsql
as $$
declare
  playlist_kind text;
  playlist_owner uuid;
  video_owner uuid;
begin
  select p.kind, p.user_id
  into playlist_kind, playlist_owner
  from public.playlists p
  where p.id = new.playlist_id;

  if playlist_kind is null then
    raise exception 'Playlist not found';
  end if;

  if playlist_kind = 'channel' then
    select v.user_id
    into video_owner
    from public.videos v
    where v.id = new.video_id;

    if video_owner is distinct from playlist_owner then
      raise exception 'Channel playlist can include only owner videos';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_playlist_videos_ownership on public.playlist_videos;
create trigger trg_playlist_videos_ownership
before insert or update on public.playlist_videos
for each row execute function public.enforce_playlist_video_ownership();

create or replace function public.ensure_watch_later_playlist()
returns trigger
language plpgsql
as $$
begin
  insert into public.playlists (user_id, title, description, kind, is_system, system_key, visibility)
  values (
    new.id,
    'Смотреть позже',
    'Личный закрытый системный плейлист.',
    'user',
    true,
    'watch_later',
    'private'
  )
  on conflict (user_id, system_key) where system_key is not null do nothing;

  return new;
end;
$$;

drop trigger if exists trg_users_ensure_watch_later on public.users;
create trigger trg_users_ensure_watch_later
after insert on public.users
for each row execute function public.ensure_watch_later_playlist();

insert into public.playlists (user_id, title, description, kind, is_system, system_key, visibility)
select
  u.id,
  'Смотреть позже',
  'Личный закрытый системный плейлист.',
  'user',
  true,
  'watch_later',
  'private'
from public.users u
on conflict (user_id, system_key) where system_key is not null do nothing;
