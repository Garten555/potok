import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffAuthOk = { userId: string; role: string };

/** Модератор или администратор. */
export async function requireStaff(): Promise<StaffAuthOk | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const { data: row } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const role = (row as { role?: string } | null)?.role ?? "user";
  if (role !== "moderator" && role !== "admin") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  return { userId: user.id, role };
}

function isNextResponse(x: StaffAuthOk | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}

/** Только администратор. */
export async function requireAdmin(): Promise<StaffAuthOk | NextResponse> {
  const gate = await requireStaff();
  if (isNextResponse(gate)) return gate;
  if (gate.role !== "admin") {
    return NextResponse.json({ error: "Только для администраторов" }, { status: 403 });
  }
  return gate;
}
