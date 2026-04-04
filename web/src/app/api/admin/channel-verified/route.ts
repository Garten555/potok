import { NextResponse } from "next/server";
import { resolveUserIdFromAdminInput } from "@/lib/admin-user-search";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Включить/выключить верификацию канала (модератор или админ). */
export async function POST(req: Request) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  let body: { userId?: string; verified?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const rawId = (body.userId ?? "").trim();
  if (!rawId) {
    return NextResponse.json({ error: "Укажите userId: @handle канала" }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const userId = await resolveUserIdFromAdminInput(svc, rawId);
  if (!userId) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 });
  }

  const verified = Boolean(body.verified);
  const { error } = await svc
    .from("users")
    .update({
      channel_verified: verified,
      ...(verified
        ? {
            channel_verification_request_message: null,
            channel_verification_request_at: null,
            channel_verification_request_status: "none",
          }
        : {}),
    })
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, verified });
}
