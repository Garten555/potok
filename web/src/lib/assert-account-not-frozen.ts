import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Для мутаций: если аккаунт заморожен — 403. При ошибке чтения профиля не блокируем. */
export async function frozenAccountJsonResponse(
  supabase: SupabaseClient,
  userId: string,
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from("users")
    .select("account_frozen_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  const row = data as { account_frozen_at?: string | null } | null;
  if (row?.account_frozen_at) {
    return NextResponse.json(
      { error: "Аккаунт заморожен. Действие недоступно до разморозки." },
      { status: 403 },
    );
  }
  return null;
}
