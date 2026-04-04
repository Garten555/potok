import { NextResponse } from "next/server";
import { CHANNEL_VERIFICATION_MIN_SUBSCRIBERS } from "@/lib/channel-verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Заявка на верификацию канала из студии. */
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
    .select(
      "subscribers_count, channel_verified, channel_verification_request_status, account_frozen_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Профиль не найден." }, { status: 400 });
  }

  const u = row as {
    subscribers_count: number | null;
    channel_verified: boolean | null;
    channel_verification_request_status: string | null;
    account_frozen_at: string | null;
  };

  if (u.account_frozen_at) {
    return NextResponse.json({ error: "Аккаунт заморожен. Заявка недоступна до разморозки." }, { status: 403 });
  }

  if (u.channel_verified) {
    return NextResponse.json({ error: "Канал уже верифицирован." }, { status: 400 });
  }
  const subs = Number(u.subscribers_count ?? 0);
  if (subs < CHANNEL_VERIFICATION_MIN_SUBSCRIBERS) {
    return NextResponse.json(
      {
        error: `Нужно не меньше ${CHANNEL_VERIFICATION_MIN_SUBSCRIBERS} подписчиков, чтобы подать заявку.`,
      },
      { status: 400 },
    );
  }
  const st = u.channel_verification_request_status ?? "none";
  if (st === "pending") {
    return NextResponse.json({ error: "Заявка уже на рассмотрении." }, { status: 400 });
  }

  const { error } = await svc
    .from("users")
    .update({
      channel_verification_request_message: message,
      channel_verification_request_at: new Date().toISOString(),
      channel_verification_request_status: "pending",
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
