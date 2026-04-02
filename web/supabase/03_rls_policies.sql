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
