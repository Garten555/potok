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

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
