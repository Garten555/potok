import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { frozenAccountJsonResponse } from "@/lib/assert-account-not-frozen";
import { REPORT_REASON_CODES, type ReportReasonCode } from "@/lib/report-reasons";

const ALLOWED = new Set<string>(REPORT_REASON_CODES.map((r) => r.code));

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const frozenRes = await frozenAccountJsonResponse(supabase, user.id);
  if (frozenRes) return frozenRes;

  let body: {
    target_type?: string;
    target_id?: string;
    reason_code?: string;
    details?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const targetType = body.target_type;
  const targetId = body.target_id;
  const reasonCode = body.reason_code as ReportReasonCode | undefined;
  const details = typeof body.details === "string" ? body.details.slice(0, 2000) : null;

  if (targetType !== "video" && targetType !== "comment" && targetType !== "channel") {
    return NextResponse.json({ error: "Неверный target_type" }, { status: 400 });
  }
  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "Нужен target_id" }, { status: 400 });
  }
  if (!reasonCode || !ALLOWED.has(reasonCode)) {
    return NextResponse.json({ error: "Неверная причина" }, { status: 400 });
  }

  if (targetType === "channel" && targetId === user.id) {
    return NextResponse.json({ error: "Нельзя пожаловаться на свой канал" }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason_code: reasonCode,
    details,
    status: "open",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
