alter table public.users
add column if not exists channel_handle text;

create or replace function public.generate_channel_handle(channel_name text, user_id uuid)
returns text
language plpgsql
as $$
declare
  base text;
  suffix text;
begin
  base := lower(coalesce(channel_name, ''));
  base := regexp_replace(base, '\s+', '-', 'g');
  base := regexp_replace(base, '[^a-z0-9._-]+', '', 'g');
  base := regexp_replace(base, '[-._]{2,}', '-', 'g');
  base := trim(both '-._' from base);

  if length(base) < 3 then
    base := 'channel';
  end if;

  suffix := substr(replace(user_id::text, '-', ''), 1, 6);
  return left(base, 23) || '-' || suffix;
end;
$$;

update public.users
set channel_handle = public.generate_channel_handle(channel_name, id)
where channel_handle is null or btrim(channel_handle) = '';

create or replace function public.ensure_channel_handle()
returns trigger
language plpgsql
as $$
begin
  if new.channel_handle is null or btrim(new.channel_handle) = '' then
    new.channel_handle := public.generate_channel_handle(new.channel_name, new.id);
  else
    new.channel_handle := lower(new.channel_handle);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_ensure_channel_handle on public.users;
create trigger trg_users_ensure_channel_handle
before insert or update of channel_handle on public.users
for each row execute function public.ensure_channel_handle();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_channel_handle_format_chk'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
    add constraint users_channel_handle_format_chk
    check (channel_handle ~ '^[a-z0-9][a-z0-9._-]{2,29}$');
  end if;
end;
$$;

alter table public.users
alter column channel_handle set not null;

create unique index if not exists users_channel_handle_lower_uidx
  on public.users (lower(channel_handle));
