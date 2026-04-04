-- Клиент подписывается на обновления строки users (роль, профиль) без перезагрузки страницы.
-- Выполните в SQL Editor, если таблица ещё не в публикации supabase_realtime.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users'
     ) then
    alter publication supabase_realtime add table public.users;
  end if;
end $$;
