-- Штрафы по жалобам: ограничение загрузки, «мягкая» заморозка канала (подписчики сохраняются),
-- жёсткая заморозка на 6 месяцев без апелляции. RLS: вставка видео только если разрешена функцией.

alter table public.users
  add column if not exists upload_banned_until timestamptz null;

alter table public.users
  add column if not exists moderation_soft_freeze_at timestamptz null;

alter table public.users
  add column if not exists moderation_hard_freeze_until timestamptz null;

alter table public.users
  add column if not exists moderation_no_appeal boolean not null default false;

comment on column public.users.upload_banned_until is 'Временный запрет загрузки видео (например после N жалоб).';
comment on column public.users.moderation_soft_freeze_at is 'Канал скрыт от публики, подписчики не удаляются.';
comment on column public.users.moderation_hard_freeze_until is 'Долгая модерационная блокировка до указанной даты.';
comment on column public.users.moderation_no_appeal is 'Для жёсткой блокировки: апелляция недоступна.';

create index if not exists users_upload_banned_until_idx
  on public.users (upload_banned_until)
  where upload_banned_until is not null;

create index if not exists users_moderation_hard_until_idx
  on public.users (moderation_hard_freeze_until)
  where moderation_hard_freeze_until is not null;

-- Разрешена ли вставка строки в videos от имени uid (используется в RLS).
create or replace function public.user_can_upload_video(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.users u
    where u.id = uid
      and (
        u.account_frozen_at is not null
        or (u.upload_banned_until is not null and u.upload_banned_until > now())
        or u.moderation_soft_freeze_at is not null
        or (u.moderation_hard_freeze_until is not null and u.moderation_hard_freeze_until > now())
      )
  );
$$;

drop policy if exists videos_insert_owner on public.videos;
create policy videos_insert_owner on public.videos
for insert with check (
  auth.uid() = user_id
  and public.user_can_upload_video(auth.uid())
);

-- Жалобы на видео и канал владельца (комментарии в штрафах не учитываем).
create or replace function public.count_active_reports_against_owner(owner_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.reports r
  where r.status <> 'dismissed'
    and (
      (r.target_type = 'channel' and r.target_id = owner_id)
      or (
        r.target_type = 'video'
        and exists (
          select 1 from public.videos v
          where v.id = r.target_id and v.user_id = owner_id
        )
      )
    );
$$;
