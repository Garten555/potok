-- При установке account_frozen_at снимаем всех подписчиков с канала (счётчик обновит триггер на subscriptions).

create or replace function public.remove_subscriptions_when_account_frozen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.account_frozen_at is null and new.account_frozen_at is not null then
    delete from public.subscriptions where channel_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_remove_subscriptions_on_freeze on public.users;
create trigger trg_remove_subscriptions_on_freeze
after update of account_frozen_at on public.users
for each row
when (old.account_frozen_at is distinct from new.account_frozen_at)
execute function public.remove_subscriptions_when_account_frozen();

comment on function public.remove_subscriptions_when_account_frozen() is
  'При заморозке аккаунта удаляет все строки subscriptions на этот channel_id.';
