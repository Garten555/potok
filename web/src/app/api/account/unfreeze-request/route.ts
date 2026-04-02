import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Заявка на разморозку с пояснением «почему ушли». */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (message.length < 10) {
    return NextResponse.json({ error: "Напишите не короче 10 символов." }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Слишком длинный текст." }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const { data: row, error: fetchErr } = await svc
    .from("users")
    .select("account_frozen_at, unfreeze_request_status")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Профиль не найден." }, { status: 400 });
  }

  const u = row as { account_frozen_at: string | null; unfreeze_request_status: string };
  if (!u.account_frozen_at) {
    return NextResponse.json({ error: "Аккаунт не заморожен." }, { status: 400 });
  }
  if (u.unfreeze_request_status === "pending") {
    return NextResponse.json({ error: "Заявка уже отправлена." }, { status: 400 });
  }

  const { error } = await svc
    .from("users")
    .update({
      unfreeze_request_message: message,
      unfreeze_request_at: new Date().toISOString(),
      unfreeze_request_status: "pending",
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
