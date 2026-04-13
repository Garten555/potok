-- Назначить роль admin пользователю danil.akhunov2023@gmail.com
-- Supabase → SQL Editor → Run.
-- Нужны: регистрация в auth и строка в public.users (обычно создаётся при первом входе).

-- 1) Назначение прав администратора
update public.users u
set role = 'admin'
from auth.users a
where u.id = a.id
  and lower(a.email) = lower('danil.akhunov2023@gmail.com');

-- 2) Проверка: этот пользователь и его роль
select
  u.id,
  a.email,
  u.role,
  u.channel_handle
from public.users u
join auth.users a on a.id = u.id
where lower(a.email) = lower('danil.akhunov2023@gmail.com');

-- 3) (опционально) все аккаунты с ролью admin
-- select u.id, a.email, u.role
-- from public.users u
-- join auth.users a on a.id = u.id
-- where u.role = 'admin'
-- order by a.email;
