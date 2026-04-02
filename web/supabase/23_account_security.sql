-- Заморозка аккаунта (аналог «удаления» с хранением данных), заявка на разморозку.

alter table public.users
  add column if not exists account_frozen_at timestamptz,
  add column if not exists account_data_retention_until timestamptz,
  add column if not exists unfreeze_request_message text,
  add column if not exists unfreeze_request_at timestamptz,
  add column if not exists unfreeze_request_status text not null default 'none'
    check (unfreeze_request_status in ('none', 'pending', 'approved', 'rejected'));

comment on column public.users.account_frozen_at is 'Аккаунт заморожен: контент скрыт, вход ведёт на заявку о разморозке.';
comment on column public.users.account_data_retention_until is 'Срок хранения персональных данных (например, +5 лет с даты заморозки).';
comment on column public.users.unfreeze_request_status is 'Заявка пользователя на восстановление доступа.';

create index if not exists users_account_frozen_at_idx on public.users (account_frozen_at) where account_frozen_at is not null;
