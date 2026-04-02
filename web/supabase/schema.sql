create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  channel_name text not null unique,
  avatar_url text,
  subscribers_count integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists users_channel_name_lower_uidx
  on public.users (lower(channel_name));

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

insert into public.categories (name, slug)
values
  ('Музыка', 'music'),
  ('Видеоигры', 'games'),
  ('Образование', 'education'),
  ('Спорт', 'sport'),
  ('Фильмы и сериалы', 'movies'),
  ('Комедия', 'comedy'),
  ('Техника', 'tech')
on conflict (slug) do nothing;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid not null references public.categories(id),
  tags text[] not null default '{}',
  video_url text not null,
  thumbnail_url text,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  subscriber_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, channel_id),
  constraint subscriptions_no_self check (subscriber_id <> channel_id)
);

create table if not exists public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  type text not null check (type in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

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

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists videos_category_created_idx on public.videos(category_id, created_at desc);
create index if not exists videos_views_idx on public.videos(views desc);
create index if not exists comments_video_created_idx on public.comments(video_id, created_at asc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.videos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists users_select_all on public.users;
create policy users_select_all on public.users
for select using (true);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
for insert with check (auth.uid() = id);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
for update using (auth.uid() = id);

drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
for select using (true);

drop policy if exists videos_select_all on public.videos;
create policy videos_select_all on public.videos
for select using (true);

drop policy if exists videos_insert_owner on public.videos;
create policy videos_insert_owner on public.videos
for insert with check (auth.uid() = user_id);

drop policy if exists videos_update_owner on public.videos;
create policy videos_update_owner on public.videos
for update using (auth.uid() = user_id);

drop policy if exists videos_delete_owner on public.videos;
create policy videos_delete_owner on public.videos
for delete using (auth.uid() = user_id);

drop policy if exists subscriptions_select_all on public.subscriptions;
create policy subscriptions_select_all on public.subscriptions
for select using (true);

drop policy if exists subscriptions_insert_self on public.subscriptions;
create policy subscriptions_insert_self on public.subscriptions
for insert with check (auth.uid() = subscriber_id);

drop policy if exists subscriptions_delete_self on public.subscriptions;
create policy subscriptions_delete_self on public.subscriptions
for delete using (auth.uid() = subscriber_id);

drop policy if exists likes_select_all on public.likes;
create policy likes_select_all on public.likes
for select using (true);

drop policy if exists likes_insert_self on public.likes;
create policy likes_insert_self on public.likes
for insert with check (auth.uid() = user_id);

drop policy if exists likes_update_self on public.likes;
create policy likes_update_self on public.likes
for update using (auth.uid() = user_id);

drop policy if exists likes_delete_self on public.likes;
create policy likes_delete_self on public.likes
for delete using (auth.uid() = user_id);

drop policy if exists comments_select_all on public.comments;
create policy comments_select_all on public.comments
for select using (true);

drop policy if exists comments_insert_self on public.comments;
create policy comments_insert_self on public.comments
for insert with check (auth.uid() = user_id);

drop policy if exists comments_update_self on public.comments;
create policy comments_update_self on public.comments
for update using (auth.uid() = user_id);

drop policy if exists comments_delete_self on public.comments;
create policy comments_delete_self on public.comments
for delete using (auth.uid() = user_id);

drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self on public.notifications
for select using (auth.uid() = user_id);

drop policy if exists notifications_insert_self on public.notifications;
create policy notifications_insert_self on public.notifications
for insert with check (auth.uid() = user_id);

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications
for update using (auth.uid() = user_id);

drop policy if exists notifications_delete_self on public.notifications;
create policy notifications_delete_self on public.notifications
for delete using (auth.uid() = user_id);
