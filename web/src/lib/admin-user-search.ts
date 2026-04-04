import type { SupabaseClient } from "@supabase/supabase-js";

/** Только для resolve: кнопки в админке передают id строки; в полях поиска UUID не используем. */
const ADMIN_ROW_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedAdminUserSearch = { kind: "text"; term: string };

/**
 * Разбор поиска в админке: @handle или подстрока имени/handle (от 2 символов после нормализации).
 * UUID намеренно не поддерживаем — в UI ориентируемся на ник, как на сайте (@garten-f06e15).
 */
export function parseAdminUserSearchQuery(raw: string): ParsedAdminUserSearch | null {
  const t = raw.trim();
  if (!t) return null;
  const term = (t.startsWith("@") ? t.slice(1) : t).replace(/[%_]/g, "").trim().slice(0, 80);
  if (term.length < 2) return null;
  if (ADMIN_ROW_ID_UUID_RE.test(term)) return null;
  return { kind: "text", term };
}

/**
 * Разрешить user_id в API: @handle / handle, либо полный UUID (только из действий по строке списка, не из поиска).
 */
export async function resolveUserIdFromAdminInput(svc: SupabaseClient, raw: string): Promise<string | null> {
  const t = raw.trim();
  if (!t) return null;

  if (ADMIN_ROW_ID_UUID_RE.test(t)) {
    const { data: byId } = await svc.from("users").select("id").eq("id", t).maybeSingle();
    return (byId as { id?: string } | null)?.id ?? null;
  }

  const handle = t.startsWith("@") ? t.slice(1).trim() : t;
  if (!handle || handle.length < 2) return null;

  const { data: exact } = await svc.from("users").select("id").eq("channel_handle", handle).maybeSingle();
  if (exact && typeof (exact as { id?: string }).id === "string") {
    return (exact as { id: string }).id;
  }

  const { data: ci } = await svc.from("users").select("id").ilike("channel_handle", handle).maybeSingle();
  if (ci && typeof (ci as { id?: string }).id === "string") {
    return (ci as { id: string }).id;
  }

  return null;
}
