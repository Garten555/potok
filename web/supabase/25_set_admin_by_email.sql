-- Назначить роль admin по email зарегистрированного пользователя.
-- Выполни в Supabase: SQL Editor → New query → вставь свой email → Run.
-- Требуется, чтобы пользователь уже был в auth (регистрация) и строка в public.users существовала.

update public.users u
set role = 'admin'
from auth.users a
where u.id = a.id
  and lower(a.email) = lower('your@email.com'); -- ← замени на email своего аккаунта

-- Проверка:
-- select u.id, a.email, u.role from public.users u join auth.users a on a.id = u.id where u.role = 'admin';
