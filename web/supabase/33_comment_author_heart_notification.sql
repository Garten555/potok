-- Уведомление автору комментария, когда владелец видео поставил «сердце» (comment_author_hearts).

create or replace function public.trg_comment_author_heart_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_author uuid;
  vid uuid;
  from_name text;
  from_avatar text;
  from_handle text;
begin
  select c.user_id, c.video_id into comment_author, vid
  from public.comments c
  where c.id = new.comment_id;

  if comment_author is null then
    return new;
  end if;

  if comment_author = new.video_owner_id then
    return new;
  end if;

  select u.channel_name, u.avatar_url, u.channel_handle
  into from_name, from_avatar, from_handle
  from public.users u
  where u.id = new.video_owner_id;

  insert into public.notifications (user_id, type, data)
  values (
    comment_author,
    'comment_author_heart',
    jsonb_build_object(
      'videoId', vid,
      'commentId', new.comment_id,
      'fromUserId', new.video_owner_id,
      'fromChannelName', from_name,
      'fromAvatarUrl', from_avatar,
      'fromChannelHandle', from_handle
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_comment_author_heart_notification on public.comment_author_hearts;
create trigger trg_comment_author_heart_notification
after insert on public.comment_author_hearts
for each row execute function public.trg_comment_author_heart_notification();
