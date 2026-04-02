"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthUserSnapshot } from "@/lib/auth/types";

const supabase = () => createSupabaseBrowserClient();

/** Клиент: текущий пользователь (для useEffect / обработчиков). */
export async function getBrowserAuthUser(): Promise<AuthUserSnapshot | null> {
  const { data } = await supabase().auth.getUser();
  const user = data.user;
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export function getSupabaseBrowser() {
  return createSupabaseBrowserClient();
}
