create or replace function public.check_comment_parent_video()
returns trigger
language plpgsql
as $$
declare
  parent_video_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select video_id into parent_video_id
  from public.comments
  where id = new.parent_id;

  if parent_video_id is null then
    raise exception 'Parent comment not found';
  end if;

  if parent_video_id <> new.video_id then
    raise exception 'Parent comment must belong to same video';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_comment_parent_video on public.comments;
create trigger trg_check_comment_parent_video
before insert or update on public.comments
for each row execute function public.check_comment_parent_video();

create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists videos_category_created_idx on public.videos(category_id, created_at desc);
create index if not exists videos_views_idx on public.videos(views desc);
create index if not exists comments_video_created_idx on public.comments(video_id, created_at asc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
