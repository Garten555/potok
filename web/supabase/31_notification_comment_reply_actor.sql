-- Денормализация автора ответа в data уведомления (ава, ник, handle) для UI без лишних запросов.

create or replace function public.trg_comment_reply_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
  from_name text;
  from_avatar text;
  from_handle text;
begin
  if new.parent_id is null then
    return new;
  end if;

  select user_id into parent_author
  from public.comments
  where id = new.parent_id;

  if parent_author is null or parent_author = new.user_id then
    return new;
  end if;

  select u.channel_name, u.avatar_url, u.channel_handle
  into from_name, from_avatar, from_handle
  from public.users u
  where u.id = new.user_id;

  insert into public.notifications (user_id, type, data)
  values (
    parent_author,
    'comment_reply',
    jsonb_build_object(
      'videoId', new.video_id,
      'parentCommentId', new.parent_id,
      'replyCommentId', new.id,
      'fromUserId', new.user_id,
      'fromChannelName', from_name,
      'fromAvatarUrl', from_avatar,
      'fromChannelHandle', from_handle
    )
  );

  return new;
end;
$$;
