-- Владелец видео/канала/ролика с комментарием может видеть жалобы на свой контент (студия «Жалобы на мой контент»).
drop policy if exists reports_select_target_owner on public.reports;
create policy reports_select_target_owner on public.reports
for select using (
  (target_type = 'video' and exists (
    select 1 from public.videos v
    where v.id = target_id and v.user_id = auth.uid()
  ))
  or
  (target_type = 'channel' and target_id = auth.uid())
  or
  (target_type = 'comment' and exists (
    select 1 from public.comments c
    join public.videos v on v.id = c.video_id
    where c.id = target_id and v.user_id = auth.uid()
  ))
);
