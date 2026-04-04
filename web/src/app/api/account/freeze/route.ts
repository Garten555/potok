import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminRole } from "@/lib/user-role";

async function soleAdminCannotFreeze(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
): Promise<boolean> {
  const { data: row } = await svc.from("users").select("role").eq("id", userId).maybeSingle();
  if (!isAdminRole((row as { role?: string | null } | null)?.role)) {
    return false;
  }
  const { count, error } = await svc
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) {
    return false;
  }
  return (count ?? 0) === 1;
}

/** Можно ли инициировать заморозку (единственный админ — нет). */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ canFreeze: false, reason: "unauthorized" as const }, { status: 401 });
  }
  const svc = createSupabaseServiceClient();
  const blocked = await soleAdminCannotFreeze(svc, user.id);
  return NextResponse.json(
    blocked
      ? { canFreeze: false, reason: "sole_admin" as const }
      : { canFreeze: true as const },
  );
}

/** Заморозка аккаунта: скрытие канала, срок хранения данных +5 лет. */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const svc = createSupabaseServiceClient();
  if (await soleAdminCannotFreeze(svc, user.id)) {
    return NextResponse.json(
      {
        error:
          "Вы единственный администратор. Назначьте другого администратора в разделе «Модераторы», затем сможете заморозить аккаунт.",
      },
      { status: 403 },
    );
  }

  const frozenAt = new Date().toISOString();
  const retentionUntil = new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await svc
    .from("users")
    .update({
      account_frozen_at: frozenAt,
      account_data_retention_until: retentionUntil,
      unfreeze_request_status: "none",
      unfreeze_request_message: null,
      unfreeze_request_at: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: subErr } = await svc.from("subscriptions").delete().eq("channel_id", user.id);
  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, account_data_retention_until: retentionUntil });
}
