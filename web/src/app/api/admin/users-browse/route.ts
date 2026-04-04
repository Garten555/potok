import { NextResponse } from "next/server";
import { parseAdminUserSearchQuery } from "@/lib/admin-user-search";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type UserRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  role: string | null;
  banned_until: string | null;
  account_frozen_at: string | null;
  channel_verified: boolean | null;
};

/** Постраничный список пользователей с фильтрами по роли, верификации и подстроке ника/handle. */
export async function GET(req: Request) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const role = url.searchParams.get("role") ?? "";
  const verified = url.searchParams.get("verified") ?? "";
  const rawQ = (url.searchParams.get("q") ?? "").trim();

  const svc = createSupabaseServiceClient();

  let query = svc
    .from("users")
    .select("id, channel_name, channel_handle, role, banned_until, account_frozen_at, channel_verified", {
      count: "exact",
    });

  if (role && ["user", "moderator", "admin", "owner"].includes(role)) {
    query = query.eq("role", role);
  }
  if (verified === "yes") {
    query = query.eq("channel_verified", true);
  } else if (verified === "no") {
    query = query.eq("channel_verified", false);
  }

  const parsedQ = parseAdminUserSearchQuery(rawQ);
  if (parsedQ) {
    const like = `%${parsedQ.term}%`;
    query = query.or(`channel_handle.ilike.${like},channel_name.ilike.${like}`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    users: (data ?? []) as UserRow[],
    total: count ?? 0,
    page,
    pageSize: limit,
  });
}
