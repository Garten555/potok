import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Назначение / снятие модератора (только admin; роль admin через SQL). */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  let body: { user_id?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const role = body.role;
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: "Нужен корректный user_id" }, { status: 400 });
  }
  if (role !== "moderator" && role !== "user") {
    return NextResponse.json({ error: "role: moderator | user" }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const { data: row, error: fetchErr } = await svc
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 });
  }

  const current = (row as { role?: string }).role ?? "user";
  if (current === "admin") {
    return NextResponse.json({ error: "Нельзя менять роль администратора" }, { status: 403 });
  }

  const { error: upErr } = await svc.from("users").update({ role }).eq("id", userId);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
