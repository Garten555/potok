alter table public.videos
add column if not exists visibility text not null default 'public';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'videos_visibility_chk'
      and conrelid = 'public.videos'::regclass
  ) then
    alter table public.videos
    add constraint videos_visibility_chk
    check (visibility in ('public', 'unlisted', 'private'));
  end if;
end;
$$;

create index if not exists videos_visibility_created_idx
on public.videos(visibility, created_at desc);
