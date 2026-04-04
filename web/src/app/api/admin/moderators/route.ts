import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Список модераторов (для страницы команды). */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("users")
    .select("id, channel_name, channel_handle, role, created_at")
    .in("role", ["moderator", "admin", "owner"])
    .order("role", { ascending: true })
    .order("channel_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const staff = data ?? [];
  return NextResponse.json({ staff, moderators: staff.filter((r) => (r as { role?: string }).role === "moderator") });
}
