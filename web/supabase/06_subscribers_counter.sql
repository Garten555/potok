create or replace function public.sync_subscribers_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.users
    set subscribers_count = subscribers_count + 1
    where id = new.channel_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.users
    set subscribers_count = greatest(subscribers_count - 1, 0)
    where id = old.channel_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_subscribers_count on public.subscriptions;
create trigger trg_sync_subscribers_count
after insert or delete on public.subscriptions
for each row execute function public.sync_subscribers_count();

update public.users u
set subscribers_count = coalesce(s.cnt, 0)
from (
  select channel_id, count(*)::int as cnt
  from public.subscriptions
  group by channel_id
) s
where u.id = s.channel_id;

update public.users
set subscribers_count = 0
where id not in (select distinct channel_id from public.subscriptions);
