import { NextResponse } from "next/server";
import { resolveUserIdFromAdminInput } from "@/lib/admin-user-search";
import { isAdminRole } from "@/lib/user-role";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

/** Обновление статуса жалобы и опционально бан пользователя по результату разбора. */
export async function PATCH(req: Request, ctx: Params) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;
  const staff = { id: gate.userId };
  const staffRole = gate.role;

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

  if (body.ban_user_id && body.banned_until && !isAdminRole(staffRole)) {
    return NextResponse.json({ error: "Бан пользователей доступен только администраторам и владельцу." }, { status: 403 });
  }

  const { error: upErr } = await svc.from("reports").update(updates).eq("id", id);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  if (body.ban_user_id && body.banned_until) {
    const resolvedBanId = await resolveUserIdFromAdminInput(svc, body.ban_user_id);
    if (!resolvedBanId) {
      return NextResponse.json({ error: "Пользователь для бана не найден (введите @handle канала)" }, { status: 400 });
    }
    const banPatch: Record<string, unknown> = {
      banned_until: body.banned_until,
      ban_reason_code: body.ban_reason_code ?? null,
    };
    const { error: banErr } = await svc.from("users").update(banPatch).eq("id", resolvedBanId);
    if (banErr) {
      return NextResponse.json({ error: banErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
