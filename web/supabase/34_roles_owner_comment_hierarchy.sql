-- Роль owner (владелец платформы), иерархия удаления комментариев staff.

-- 1) Роли пользователей
alter table public.users drop constraint if exists users_role_chk;
alter table public.users
  add constraint users_role_chk
  check (role in ('user', 'moderator', 'admin', 'owner'));

comment on column public.users.role is 'user | moderator | admin | owner. owner — полный контроль ролей; назначение owner только SQL.';

-- 2) Staff включает owner (доступ к панели и общим staff-политикам)
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
      and u.role in ('moderator', 'admin', 'owner')
  );
$$;

-- 3) Модератор — только комментарии обычных пользователей; админ — user+moderator; owner — все.
create or replace function public.staff_can_delete_comment(staff_uid uuid, author_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case u.role
        when 'owner' then true
        when 'admin' then coalesce(
          (select r.role from public.users r where r.id = author_uid),
          'user'
        ) in ('user', 'moderator')
        when 'moderator' then coalesce(
          (select r.role from public.users r where r.id = author_uid),
          'user'
        ) = 'user'
        else false
      end
      from public.users u
      where u.id = staff_uid
    ),
    false
  );
$$;

-- 4) Удаление комментария: автор, владелец видео, или staff с учётом роли автора комментария
drop policy if exists comments_delete_self on public.comments;

create policy comments_delete_self on public.comments
for delete using (
  auth.uid() = user_id
  or exists (
    select 1 from public.videos v
    where v.id = comments.video_id and v.user_id = auth.uid()
  )
  or (
    public.is_staff(auth.uid())
    and public.staff_can_delete_comment(auth.uid(), comments.user_id)
  )
);
