import { NextResponse } from "next/server";
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

/** Список заявок на разморозку (только admin). Query: status=pending|approved|rejected|all, q=подстрока ника/названия (от 2 символов). */
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

  if (q.length >= 2) {
    const safe = q.replace(/[%_]/g, "").slice(0, 80);
    const like = `%${safe}%`;
    query = query.or(`channel_name.ilike.${like},channel_handle.ilike.${like}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ requests: (data ?? []) as UnfreezeRequestRow[] });
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

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const decision = body.decision;
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: "Нужен корректный user_id" }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision: approved | rejected" }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
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

  return NextResponse.json({ ok: true });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
