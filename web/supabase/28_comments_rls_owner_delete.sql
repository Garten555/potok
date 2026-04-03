-- Удаление комментария: автор комментария, владелец видео или staff.
-- Если у вас уже применён 15_moderation_recommendations.sql, политика совпадает — скрипт идемпотентен.

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
