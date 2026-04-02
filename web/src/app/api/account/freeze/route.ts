import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Заморозка аккаунта: скрытие канала, срок хранения данных +5 лет. */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const frozenAt = new Date().toISOString();
  const retentionUntil = new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString();

  const svc = createSupabaseServiceClient();
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

  return NextResponse.json({ ok: true, account_data_retention_until: retentionUntil });
}
