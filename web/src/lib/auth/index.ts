/**
 * Прослойка над Supabase Auth: одна точка для сессии, без дублирования createClient по проекту.
 * Схему БД (auth.users, public.users) не меняем — только организация кода.
 *
 * Сменить «движок» авторизации целиком без миграции данных нельзя: id пользователя зашит в FK.
 * Если понадобится Clerk/Auth.js — это отдельный проект с переносом пользователей.
 */
export { getServerAuthUser } from "@/lib/auth/server";
export { getBrowserAuthUser, getSupabaseBrowser } from "@/lib/auth/client";
export type { AuthUserSnapshot, SessionSnapshot } from "@/lib/auth/types";
