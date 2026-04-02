create or replace function public.auto_assign_video_category()
returns trigger
language plpgsql
as $$
declare
  normalized_text text;
  matched_id uuid;
begin
  if new.category_id is not null then
    return new;
  end if;

  normalized_text := lower(coalesce(new.title, '') || ' ' || coalesce(new.description, ''));

  with scored as (
    select
      c.id,
      c.slug,
      case
        when c.slug = 'games' then
          (case when normalized_text ~ '(игр|игра|игры|гейм|прохожд|летспле|стрим|киберспорт|gaming|game|walkthrough|dota|cs2|valorant|minecraft)' then 3 else 0 end)
          + (case when normalized_text ~ '(прохожд|walkthrough|let''s play)' then 2 else 0 end)
        when c.slug = 'music' then
          (case when normalized_text ~ '(музык|песня|трек|бит|клип|кавер|music|song|track|clip|cover)' then 3 else 0 end)
          + (case when normalized_text ~ '(remix|альбом|album|live)' then 2 else 0 end)
        when c.slug = 'education' then
          (case when normalized_text ~ '(урок|обуч|лекц|гайд|education|tutorial|guide|lesson|course)' then 3 else 0 end)
          + (case when normalized_text ~ '(разбор|объясн|how to|шаг за шагом)' then 2 else 0 end)
        when c.slug = 'sport' then
          (case when normalized_text ~ '(спорт|футбол|баскет|ufc|mma|трениров|sport|football|basketball|workout)' then 3 else 0 end)
          + (case when normalized_text ~ '(матч|гол|fight|fitness|cardio)' then 2 else 0 end)
        when c.slug = 'movies' then
          (case when normalized_text ~ '(фильм|сериал|кино|трейлер|movie|series|cinema|trailer)' then 3 else 0 end)
          + (case when normalized_text ~ '(обзор фильма|review|episode|season)' then 2 else 0 end)
        when c.slug = 'comedy' then
          (case when normalized_text ~ '(юмор|прикол|мем|смешно|комед|meme|funny|comedy|joke)' then 3 else 0 end)
          + (case when normalized_text ~ '(пранк|шутк|standup|stand-up)' then 2 else 0 end)
        when c.slug = 'tech' then
          (case when normalized_text ~ '(техн|смартфон|ноутбук|желез|ии|ai|программир|код|tech|gadget|programming|code)' then 3 else 0 end)
          + (case when normalized_text ~ '(benchmark|fps|обзор устройства|review|dev|docker|api)' then 2 else 0 end)
        else 0
      end as score
    from public.categories c
  )
  select id
  into matched_id
  from scored
  where score > 0
  order by score desc,
    case slug
      when 'games' then 1
      when 'music' then 2
      when 'education' then 3
      when 'sport' then 4
      when 'movies' then 5
      when 'comedy' then 6
      when 'tech' then 7
      else 99
    end
  limit 1;

  if matched_id is null then
    select c.id
    into matched_id
    from public.categories c
    where c.slug = 'education'
    limit 1;
  end if;

  new.category_id := matched_id;
  return new;
end;
$$;

drop trigger if exists trg_videos_auto_assign_category on public.videos;
create trigger trg_videos_auto_assign_category
before insert on public.videos
for each row execute function public.auto_assign_video_category();
