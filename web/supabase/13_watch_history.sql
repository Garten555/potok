-- История просмотров (для вкладки «История»)
create table if not exists public.watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists watch_history_user_watched_idx on public.watch_history(user_id, watched_at desc);

alter table public.watch_history enable row level security;

drop policy if exists watch_history_select_self on public.watch_history;
create policy watch_history_select_self on public.watch_history
for select using (auth.uid() = user_id);

drop policy if exists watch_history_insert_self on public.watch_history;
create policy watch_history_insert_self on public.watch_history
for insert with check (auth.uid() = user_id);

drop policy if exists watch_history_update_self on public.watch_history;
create policy watch_history_update_self on public.watch_history
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists watch_history_delete_self on public.watch_history;
create policy watch_history_delete_self on public.watch_history
for delete using (auth.uid() = user_id);

