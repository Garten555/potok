-- Назначение модераторов: через приложение (админ → /admin/team) вызывается API POST /api/admin/role
-- с service role; прямой UPDATE из клиента заблокирован RLS (users_update_self только свой профиль).
-- Роль admin по-прежнему задаётся вручную SQL (например 25_set_admin_by_email.sql).

comment on column public.users.role is 'user | moderator | admin. moderator/admin назначает только admin через API или SQL.';
