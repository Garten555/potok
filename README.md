# POTOK

Видеоплатформа на **Next.js** с **Supabase** (БД, auth, хранилище) и **Pusher** для обновлений в реальном времени.

## Версия

| Источник | Значение |
|----------|----------|
| Версия приложения | см. `web/package.json` → поле `"version"` |
| Журнал изменений | [`CHANGELOG.md`](./CHANGELOG.md) |
| Точки отката в Git | теги `v0.4.0`, `v0.3.0`, … (`git tag -l`) |

Чтобы **вернуться к конкретной версии кода** (например, после экспериментов):

```bash
git fetch origin --tags
git checkout v0.4.0
cd web && npm ci && npm run build && npm start
```

Вернуться на актуальную ветку:

```bash
git checkout main
git pull
```

Новый релиз: обновите `"version"` в `web/package.json`, допишите раздел в `CHANGELOG.md`, закоммитьте и создайте тег:

```bash
git tag -a v0.3.0 -m "Release 0.3.0"
git push origin main --tags
```

## Структура репозитория

| Путь | Назначение |
|------|------------|
| `web/` | Фронтенд и API-роуты Next.js |
| `web/supabase/` | SQL-миграции и схема для Supabase |
| `docs/` | Доп. материалы (скриншоты и т.д.) |

## Требования

- **Node.js** 20+ (рекомендуется LTS)
- Проект в **Supabase** и ключи в `.env`

## Быстрый старт

```bash
cd web
npm install
cp .env.example .env.local
# Заполните .env.local своими URL и ключами (не коммитьте!)
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

### Сборка для продакшена

```bash
cd web
npm run build
npm start
```

## Переменные окружения

Создайте `web/.env.local` по образцу `web/.env.example`. Нужны как минимум:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — клиент Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — только на сервере (API-роуты)
- `NEXT_PUBLIC_SITE_URL` — публичный URL сайта
- `NEXT_PUBLIC_PUSHER_*`, `PUSHER_*` — realtime (комментарии и т.д.)
- При необходимости SMTP для писем восстановления пароля

## Кэш Next.js

Папка `web/.next` генерируется при `npm run build` / `dev` и в репозиторий не попадает. При странных ошибках сборки её можно удалить и пересобрать:

```bash
rm -rf web/.next   # Linux/macOS
# Windows PowerShell:
Remove-Item -Recurse -Force web\.next
cd web && npm run build
```

## Лицензия

Приватный проект — уточняйте у автора.
