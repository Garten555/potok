import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

async function requireStaff() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  const { data: row } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const role = (row as { role?: string } | null)?.role;
  if (role !== "moderator" && role !== "admin") {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  return { user };
}

/** Обновление статуса жалобы и опционально бан пользователя по результату разбора. */
export async function PATCH(req: Request, ctx: Params) {
  const gate = await requireStaff();
  if ("error" in gate && gate.error) return gate.error;
  const staff = gate.user!;

  const { id } = await ctx.params;
  let body: {
    status?: string;
    resolution_note?: string | null;
    moderator_action?: string | null;
    ban_user_id?: string | null;
    ban_reason_code?: string | null;
    banned_until?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const status = body.status;
  if (status !== "reviewing" && status !== "resolved" && status !== "dismissed" && status !== "open") {
    return NextResponse.json({ error: "Неверный status" }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const updates: Record<string, unknown> = {
    status,
    resolution_note: body.resolution_note ?? null,
    moderator_action: body.moderator_action ?? null,
    resolved_by: status === "resolved" || status === "dismissed" ? staff.id : null,
    resolved_at: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
  };

  const { error: upErr } = await svc.from("reports").update(updates).eq("id", id);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  if (body.ban_user_id && body.banned_until) {
    const banPatch: Record<string, unknown> = {
      banned_until: body.banned_until,
      ban_reason_code: body.ban_reason_code ?? null,
    };
    const { error: banErr } = await svc.from("users").update(banPatch).eq("id", body.ban_user_id);
    if (banErr) {
      return NextResponse.json({ error: banErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
