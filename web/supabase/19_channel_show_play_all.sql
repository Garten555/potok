-- Кнопка «Воспроизвести всё» на главной канала (можно отключить в студии).
alter table public.users
  add column if not exists channel_show_play_all boolean not null default true;

comment on column public.users.channel_show_play_all is 'Показывать ссылку «Воспроизвести всё» у рядов на главной канала.';
