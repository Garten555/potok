-- Раздел «другие каналы» в рядах главной (channel_home_sections.section_kind = spotlight).

alter table public.channel_home_sections drop constraint if exists channel_home_sections_section_kind_check;
alter table public.channel_home_sections
  add constraint channel_home_sections_section_kind_check
  check (section_kind in ('uploads', 'playlist', 'spotlight'));

alter table public.channel_home_sections drop constraint if exists channel_home_sections_playlist_fk;
alter table public.channel_home_sections
  add constraint channel_home_sections_playlist_fk check (
    (section_kind = 'playlist' and playlist_id is not null)
    or (section_kind = 'uploads' and playlist_id is null)
    or (section_kind = 'spotlight' and playlist_id is null)
  );

-- Кто уже настроил ссылки «другие каналы», но без ряда в разделах — добавить один ряд spotlight в конец.
insert into public.channel_home_sections (id, user_id, position, section_kind, playlist_id, display_title)
select gen_random_uuid(),
  l.owner_id,
  (select coalesce(max(s.position), -1) + 1 from public.channel_home_sections s where s.user_id = l.owner_id),
  'spotlight',
  null,
  nullif(trim(coalesce(u.channel_spotlight_title, '')), '')
from (select distinct owner_id from public.channel_spotlight_links) l
inner join public.users u on u.id = l.owner_id
where not exists (
  select 1 from public.channel_home_sections s2 where s2.user_id = l.owner_id and s2.section_kind = 'spotlight'
)
  and (
    select coalesce(max(s.position), -1) + 1
    from public.channel_home_sections s
    where s.user_id = l.owner_id
  ) < 12;
