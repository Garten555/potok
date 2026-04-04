-- Если раньше применяли 32_push_subscriptions.sql — выполните этот скрипт в Supabase, чтобы убрать неиспользуемую таблицу Web Push.
-- Если таблицы не было — скрипт безопасен (IF EXISTS).

drop table if exists public.push_subscriptions cascade;
