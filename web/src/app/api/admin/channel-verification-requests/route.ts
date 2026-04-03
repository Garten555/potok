import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ChannelVerificationRequestRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  subscribers_count: number | null;
  channel_verification_request_message: string | null;
  channel_verification_request_at: string | null;
  channel_verification_request_status: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Список заявок на галочку (модератор/админ). Query: q — подстрока названия или @ника (от 2 символов). */
export async function GET(req: Request) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const rawQ = (url.searchParams.get("q") ?? "").trim();

  const svc = createSupabaseServiceClient();
  let query = svc
    .from("users")
    .select(
      "id, channel_name, channel_handle, subscribers_count, channel_verification_request_message, channel_verification_request_at, channel_verification_request_status",
    )
    .eq("channel_verification_request_status", "pending")
    .order("channel_verification_request_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (rawQ.length >= 2) {
    const safe = rawQ.startsWith("@") ? rawQ.slice(1) : rawQ;
    const term = safe.replace(/[%_]/g, "").slice(0, 80);
    if (term.length >= 2) {
      const like = `%${term}%`;
      query = query.or(`channel_name.ilike.${like},channel_handle.ilike.${like}`);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ requests: (data ?? []) as ChannelVerificationRequestRow[] });
}

/** Одобрить или отклонить заявку на верификацию. */
export async function PATCH(req: Request) {
  const gate = await requireStaff();
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
    .select("id, channel_verified, channel_verification_request_status")
    .eq("id", userId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 });
  }

  const u = row as { channel_verified: boolean | null; channel_verification_request_status: string | null };
  if (u.channel_verified) {
    return NextResponse.json({ error: "Канал уже верифицирован" }, { status: 400 });
  }
  if (u.channel_verification_request_status !== "pending") {
    return NextResponse.json({ error: "Нет активной заявки" }, { status: 400 });
  }

  if (decision === "approved") {
    const { error } = await svc
      .from("users")
      .update({
        channel_verified: true,
        channel_verification_request_message: null,
        channel_verification_request_at: null,
        channel_verification_request_status: "none",
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    const { error } = await svc
      .from("users")
      .update({
        channel_verification_request_message: null,
        channel_verification_request_at: null,
        channel_verification_request_status: "rejected",
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
