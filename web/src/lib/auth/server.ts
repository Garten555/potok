import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthUserSnapshot } from "@/lib/auth/types";

/** Сервер: текущий пользователь Supabase Auth (схема БД не меняется). */
export async function getServerAuthUser(): Promise<AuthUserSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email };
}
