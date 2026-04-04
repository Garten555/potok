-- Верификация канала (отметка выдаётся модератором/админом через админку).

alter table public.users
  add column if not exists channel_verified boolean not null default false;

comment on column public.users.channel_verified is 'Верифицированный канал (отметка на платформе).';

create index if not exists users_channel_verified_idx on public.users (channel_verified) where channel_verified = true;
