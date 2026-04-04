import { NextResponse } from "next/server";
import { parseAdminUserSearchQuery, resolveUserIdFromAdminInput } from "@/lib/admin-user-search";
import { requireAdmin } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type UnfreezeRequestRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  account_frozen_at: string | null;
  unfreeze_request_message: string | null;
  unfreeze_request_at: string | null;
  unfreeze_request_status: string;
};

const STATUS_FILTERS = ["pending", "approved", "rejected", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Список заявок на разморозку (только admin). Query: status=…, q=@handle / подстрока ника. */
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const rawStatus = (url.searchParams.get("status") ?? "pending").toLowerCase();
  const statusFilter: StatusFilter = STATUS_FILTERS.includes(rawStatus as StatusFilter)
    ? (rawStatus as StatusFilter)
    : "pending";
  const q = (url.searchParams.get("q") ?? "").trim();

  const svc = createSupabaseServiceClient();

  let query = svc
    .from("users")
    .select(
      "id, channel_name, channel_handle, account_frozen_at, unfreeze_request_message, unfreeze_request_at, unfreeze_request_status",
    )
    .order("unfreeze_request_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (statusFilter === "pending") {
    query = query.eq("unfreeze_request_status", "pending").not("account_frozen_at", "is", null);
  } else if (statusFilter === "rejected") {
    query = query.eq("unfreeze_request_status", "rejected").not("account_frozen_at", "is", null);
  } else if (statusFilter === "approved") {
    query = query.eq("unfreeze_request_status", "approved");
  } else {
    query = query.in("unfreeze_request_status", ["pending", "rejected", "approved"]);
  }

  const parsedQ = parseAdminUserSearchQuery(q);
  if (parsedQ) {
    const like = `%${parsedQ.term}%`;
    query = query.or(`channel_name.ilike.${like},channel_handle.ilike.${like}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { requests: (data ?? []) as UnfreezeRequestRow[] },
    { headers: { "Cache-Control": "no-store, must-revalidate" } },
  );
}

/** Одобрить или отклонить заявку на разморозку. */
export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  let body: { user_id?: string; decision?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const rawId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const decision = body.decision;
  if (!rawId) {
    return NextResponse.json({ error: "Укажите user_id: @handle канала" }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision: approved | rejected" }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const userId = await resolveUserIdFromAdminInput(svc, rawId);
  if (!userId) {
    return NextResponse.json({ error: "Пользователь не найден (@handle канала)" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await svc
    .from("users")
    .select("id, account_frozen_at, unfreeze_request_status")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 });
  }

  const u = row as { account_frozen_at: string | null; unfreeze_request_status: string };
  if (u.unfreeze_request_status !== "pending") {
    return NextResponse.json({ error: "Нет активной заявки на разморозку" }, { status: 400 });
  }

  if (decision === "approved") {
    const { error } = await svc
      .from("users")
      .update({
        account_frozen_at: null,
        unfreeze_request_status: "approved",
        unfreeze_request_message: null,
        unfreeze_request_at: null,
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    const { error } = await svc
      .from("users")
      .update({
        unfreeze_request_status: "rejected",
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
