import { NextResponse } from "next/server";
import { resolveUserIdFromAdminInput } from "@/lib/admin-user-search";
import { isAdminRole, isOwnerRole } from "@/lib/user-role";
import { pusherServer } from "@/lib/pusher/server";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { USER_SESSION_ROLE_EVENT, userNotificationsChannelName } from "@/lib/pusher/user-notifications";

type TargetRole = "user" | "moderator" | "admin";

async function pushRoleToUser(userId: string, role: string) {
  try {
    await pusherServer.trigger(userNotificationsChannelName(userId), USER_SESSION_ROLE_EVENT, { role });
  } catch {
    /* Pusher недоступен — клиент обновится через Realtime/focus */
  }
}

/** Назначение ролей: модератор/user — админ и владелец; admin — только владелец. Роль owner только через SQL. */
export async function POST(req: Request) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  const caller = gate.role;
  if (!isAdminRole(caller)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let body: { user_id?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const raw = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const role = body.role as TargetRole | undefined;
  if (!raw) {
    return NextResponse.json({ error: "Укажите @handle канала (как на сайте)" }, { status: 400 });
  }
  if (role !== "moderator" && role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "role: moderator | user | admin" }, { status: 400 });
  }

  if (role === "admin" && !isOwnerRole(caller)) {
    return NextResponse.json({ error: "Назначать администраторов может только владелец платформы" }, { status: 403 });
  }

  const svc = createSupabaseServiceClient();
  const resolvedId = await resolveUserIdFromAdminInput(svc, raw);
  if (!resolvedId) {
    return NextResponse.json(
      { error: "Пользователь не найден: проверьте @handle (ник в URL канала)" },
      { status: 400 },
    );
  }

  const userId = resolvedId;
  const { data: row, error: fetchErr } = await svc.from("users").select("id, role").eq("id", userId).maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 });
  }

  const current = ((row as { role?: string }).role ?? "user").trim().toLowerCase();

  if (current === "owner") {
    return NextResponse.json({ error: "Нельзя менять роль владельца платформы через API" }, { status: 403 });
  }

  if (!isOwnerRole(caller)) {
    if (current === "admin" || current === "owner") {
      return NextResponse.json({ error: "Нельзя менять роль администратора" }, { status: 403 });
    }
  }

  const { error: upErr } = await svc.from("users").update({ role }).eq("id", userId);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  await pushRoleToUser(userId, role);

  return NextResponse.json({ ok: true });
}
