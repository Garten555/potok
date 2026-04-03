import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Роль текущего пользователя из БД (по service role, только строка с id = JWT).
 * Нужна, чтобы UI не зависел от кэша PostgREST/клиента и совпадала с SQL в Dashboard.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const cacheHeaders = {
    "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
  };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const role = (data as { role?: string } | null)?.role ?? null;
    return NextResponse.json({ role }, { headers: cacheHeaders });
  }

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.from("users").select("role").eq("id", user.id).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const role = (data as { role?: string } | null)?.role ?? null;
  return NextResponse.json({ role }, { headers: cacheHeaders });
}
