import { NextResponse } from "next/server";
import { isAdminRole, isStaffRole } from "@/lib/user-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffAuthOk = { userId: string; role: string };

/** Модератор, администратор или владелец платформы. */
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
  if (!isStaffRole(role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  return { userId: user.id, role };
}

function isNextResponse(x: StaffAuthOk | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}

/** Администратор или владелец (не модератор). */
export async function requireAdmin(): Promise<StaffAuthOk | NextResponse> {
  const gate = await requireStaff();
  if (isNextResponse(gate)) return gate;
  if (!isAdminRole(gate.role)) {
    return NextResponse.json({ error: "Только для администраторов" }, { status: 403 });
  }
  return gate;
}

/** Только владелец платформы. */
export async function requireOwner(): Promise<StaffAuthOk | NextResponse> {
  const gate = await requireStaff();
  if (isNextResponse(gate)) return gate;
  if (gate.role !== "owner") {
    return NextResponse.json({ error: "Только для владельца платформы" }, { status: 403 });
  }
  return gate;
}
