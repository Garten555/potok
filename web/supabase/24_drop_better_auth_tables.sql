-- Удаление таблиц Better Auth (если миграция ba:migrate когда-либо выполнялась).
-- Имена с кавычками — как у Kysely/Better Auth в PostgreSQL.
DROP TABLE IF EXISTS public."twoFactor" CASCADE;
DROP TABLE IF EXISTS public."session" CASCADE;
DROP TABLE IF EXISTS public."account" CASCADE;
DROP TABLE IF EXISTS public."verification" CASCADE;
DROP TABLE IF EXISTS public."rateLimit" CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;
