-- Роли, баны, жалобы, «сердце автора» у комментариев, уведомление об ответе.
-- Один уровень ответов: ответ разрешён только к корневому комментарию.

alter table public.users
  add column if not exists role text not null default 'user';

alter table public.users
  drop constraint if exists users_role_chk;

alter table public.users
  add constraint users_role_chk
  check (role in ('user', 'moderator', 'admin'));

alter table public.users
  add column if not exists banned_until timestamptz null;

alter table public.users
  add column if not exists ban_reason_code text null;

-- --- Вспомогательные функции для RLS (security definer) ---

create or replace function public.user_is_banned(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and u.banned_until is not null
      and u.banned_until > now()
  );
$$;

create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and u.role in ('moderator', 'admin')
  );
$$;

-- --- Жалобы ---

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('video', 'comment', 'channel')),
  target_id uuid not null,
  reason_code text not null,
  details text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by uuid null references auth.users(id) on delete set null,
  resolution_note text null,
  moderator_action text null -- например: ban_user, delete_comment, hide_video, dismiss
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create index if not exists reports_reason_idx
  on public.reports (reason_code);

create index if not exists reports_target_idx
  on public.reports (target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
for insert with check (auth.uid() = reporter_id);

drop policy if exists reports_select_self on public.reports;
create policy reports_select_self on public.reports
for select using (auth.uid() = reporter_id);

-- --- Сердце автора у комментария (неограниченное число комментариев на видео) ---

create table if not exists public.comment_author_hearts (
  comment_id uuid not null references public.comments(id) on delete cascade,
  video_owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, video_owner_id)
);

create index if not exists comment_author_hearts_owner_idx
  on public.comment_author_hearts (video_owner_id);

alter table public.comment_author_hearts enable row level security;

drop policy if exists comment_author_hearts_select_all on public.comment_author_hearts;
create policy comment_author_hearts_select_all on public.comment_author_hearts
for select using (true);

drop policy if exists comment_author_hearts_insert_owner on public.comment_author_hearts;
create policy comment_author_hearts_insert_owner on public.comment_author_hearts
for insert with check (
  auth.uid() = video_owner_id
  and exists (
    select 1
    from public.comments c
    join public.videos v on v.id = c.video_id
    where c.id = comment_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists comment_author_hearts_delete_owner on public.comment_author_hearts;
create policy comment_author_hearts_delete_owner on public.comment_author_hearts
for delete using (auth.uid() = video_owner_id);

-- --- Глубина ответов: только один уровень ---

create or replace function public.check_comment_parent_video()
returns trigger
language plpgsql
as $$
declare
  parent_video_id uuid;
  parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select video_id, parent_id into parent_video_id, parent_parent_id
  from public.comments
  where id = new.parent_id;

  if parent_video_id is null then
    raise exception 'Parent comment not found';
  end if;

  if parent_video_id <> new.video_id then
    raise exception 'Parent comment must belong to same video';
  end if;

  if parent_parent_id is not null then
    raise exception 'Replies only one level deep';
  end if;

  return new;
end;
$$;

-- --- Уведомление при ответе на комментарий ---

create or replace function public.trg_comment_reply_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
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

  insert into public.notifications (user_id, type, data)
  values (
    parent_author,
    'comment_reply',
    jsonb_build_object(
      'videoId', new.video_id,
      'parentCommentId', new.parent_id,
      'replyCommentId', new.id,
      'fromUserId', new.user_id
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_comment_reply_notification on public.comments;
create trigger trg_comment_reply_notification
after insert on public.comments
for each row execute function public.trg_comment_reply_notification();

-- --- Комментарии: бан не может писать; удаление автором видео, автором комментария, модератором ---

drop policy if exists comments_insert_self on public.comments;
create policy comments_insert_self on public.comments
for insert with check (
  auth.uid() = user_id
  and not public.user_is_banned(auth.uid())
);

drop policy if exists comments_delete_self on public.comments;
create policy comments_delete_self on public.comments
for delete using (
  auth.uid() = user_id
  or exists (
    select 1 from public.videos v
    where v.id = comments.video_id and v.user_id = auth.uid()
  )
  or public.is_staff(auth.uid())
);

-- --- Модератор может менять видимость ролика ---

drop policy if exists videos_update_staff on public.videos;
create policy videos_update_staff on public.videos
for update using (public.is_staff(auth.uid()));
