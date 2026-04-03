-- Заявка автора на верификацию канала (галочка): текст в студии, рассмотрение в админке.

alter table public.users
  add column if not exists channel_verification_request_message text null;

alter table public.users
  add column if not exists channel_verification_request_at timestamptz null;

alter table public.users
  add column if not exists channel_verification_request_status text not null default 'none';

alter table public.users drop constraint if exists users_channel_verification_request_status_chk;
alter table public.users
  add constraint users_channel_verification_request_status_chk
  check (channel_verification_request_status in ('none', 'pending', 'rejected'));

comment on column public.users.channel_verification_request_message is 'Текст заявки на галочку (от автора).';
comment on column public.users.channel_verification_request_at is 'Когда отправлена заявка.';
comment on column public.users.channel_verification_request_status is 'none | pending | rejected; после одобрения галочки — none, смотрим channel_verified.';

create index if not exists users_channel_verification_pending_idx
  on public.users (channel_verification_request_status)
  where channel_verification_request_status = 'pending';
