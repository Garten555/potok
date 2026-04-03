import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const userId = (body.userId ?? "").trim();
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: "Некорректный userId" }, { status: 400 });
  }

  const verified = Boolean(body.verified);
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("users").update({ channel_verified: verified }).eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, verified });
}
