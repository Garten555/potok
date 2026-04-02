Шаблоны для Supabase Dashboard (вставка HTML в письма).

ГДЕ В ИНТЕРФЕЙСЕ
1. Проект: https://supabase.com/dashboard → ваш проект.
2. Слева: Authentication → Email Templates.
3. Шаблон «Reset password» (сброс пароля):
   - Поле Subject: например «POTOK — код для сброса пароля»
   - Поле Body (Source): вставьте ВЕСЬ HTML из recovery.html

КРИТИЧНО — ИМЕННО ПОЭТОМУ В ПИСЬМЕ БЫЛА ССЫЛКА, А НЕ КОД
В стандартном шаблоне Supabase в теле письма стоит ссылка:
  <a href="{{ .ConfirmationURL }}">Reset Password</a>
Пока этот фрагмент остаётся в Dashboard, пользователь видит КНОПКУ/ССЫЛКУ, а не цифры.

ЧТО СДЕЛАТЬ:
1. Откройте шаблон Reset password.
2. УДАЛИТЕ из Body любые упоминания {{ .ConfirmationURL }} и любые теги <a href="...">.
3. Вставьте содержимое recovery.html целиком (там только {{ .Token }} и {{ .Email }}).
4. Сохраните (Save). Если ошибка «Failed to fetch» — другой браузер / сеть / VPN.

Переменные Supabase (для recovery.html):
- {{ .Token }} — 8 цифр (в настройках Supabase), ввод на /auth/forgot-password или /auth/reset-password
- {{ .Email }} — email пользователя (показ в письме)
- НЕ использовать {{ .ConfirmationURL }}, если нужен только код

Confirm signup: confirm_signup.html, там тоже {{ .Token }}.
