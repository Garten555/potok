create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_content_len_chk check (char_length(trim(content)) between 1 and 1000)
);

create index if not exists community_posts_user_created_idx
on public.community_posts(user_id, created_at desc);

alter table public.community_posts enable row level security;

drop policy if exists community_posts_select_all on public.community_posts;
create policy community_posts_select_all on public.community_posts
for select
using (true);

drop policy if exists community_posts_insert_owner on public.community_posts;
create policy community_posts_insert_owner on public.community_posts
for insert
with check (auth.uid() = user_id);

drop policy if exists community_posts_update_owner on public.community_posts;
create policy community_posts_update_owner on public.community_posts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists community_posts_delete_owner on public.community_posts;
create policy community_posts_delete_owner on public.community_posts
for delete
using (auth.uid() = user_id);

create or replace function public.set_community_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_community_posts_updated_at on public.community_posts;
create trigger trg_community_posts_updated_at
before update on public.community_posts
for each row execute function public.set_community_posts_updated_at();
