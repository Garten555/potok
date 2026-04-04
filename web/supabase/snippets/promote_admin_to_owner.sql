-- Повысить администратора до владельца платформы (owner) по email входа.
-- SQL Editor → New query. Подставьте реальный email (как в Authentication → Users).

update public.users u
set role = 'owner'
from auth.users a
where u.id = a.id
  and lower(trim(a.email)) = lower(trim('admin@example.com'))
  and u.role = 'admin';

-- Если строк обновилось 0: проверьте email и что в public.users.role = 'admin'.
