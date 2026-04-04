import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateChannelHandleFromName } from "@/lib/channel-handle";
import { frozenAccountJsonResponse } from "@/lib/assert-account-not-frozen";

const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const MAX_HANDLE_CHANGES_PER_30_DAYS = 3;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("users")
    .select("channel_name, channel_handle")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 400 });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("channel_handle_changes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  return NextResponse.json({
    user_id: user.id,
    channel_name: row.channel_name as string,
    channel_handle: row.channel_handle as string,
    handle_changes_in_period: count ?? 0,
    handle_changes_limit: MAX_HANDLE_CHANGES_PER_30_DAYS,
  });
}

async function resolveUniqueHandle(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  proposed: string,
): Promise<string> {
  let next = proposed;
  if (!HANDLE_RE.test(next)) {
    const uid = userId.replace(/-/g, "");
    next = `ch-${uid.slice(0, 24)}`.slice(0, 30);
  }
  for (let i = 0; i < 8; i++) {
    const { data: taken } = await supabase
      .from("users")
      .select("id")
      .eq("channel_handle", next)
      .neq("id", userId)
      .maybeSingle();
    if (!taken) return next;
    const uid = userId.replace(/-/g, "");
    next = `ch-${uid.slice(0, 20)}${i}`.slice(0, 30);
  }
  return next;
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  const frozenRes = await frozenAccountJsonResponse(supabase, user.id);
  if (frozenRes) return frozenRes;

  let body: { channel_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { data: current, error: curErr } = await supabase
    .from("users")
    .select("channel_name, channel_handle")
    .eq("id", user.id)
    .maybeSingle();
  if (curErr || !current) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 400 });
  }

  const oldHandle = String(current.channel_handle ?? "").trim().toLowerCase();
  const nextName = body.channel_name !== undefined ? String(body.channel_name).trim() : String(current.channel_name ?? "").trim();

  if (nextName.length < 2 || nextName.length > 80) {
    return NextResponse.json({ error: "Название канала: от 2 до 80 символов." }, { status: 400 });
  }

  let nextHandleRaw = generateChannelHandleFromName(nextName, user.id);
  nextHandleRaw = await resolveUniqueHandle(supabase, user.id, nextHandleRaw);

  if (!HANDLE_RE.test(nextHandleRaw)) {
    return NextResponse.json({ error: "Не удалось сформировать адрес канала. Упростите название (латиница и цифры)."}, { status: 400 });
  }

  const handleChanged = nextHandleRaw !== oldHandle;

  if (handleChanged) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("channel_handle_changes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);

    if ((count ?? 0) >= MAX_HANDLE_CHANGES_PER_30_DAYS) {
      return NextResponse.json(
        {
          error:
            "Чтобы сменить адрес канала ещё раз, отправьте запрос администратору: за последние 30 дней уже было 3 автоматических смены.",
          code: "handle_change_limit",
        },
        { status: 429 },
      );
    }
  }

  const { error: upErr } = await supabase
    .from("users")
    .update({
      channel_name: nextName,
      channel_handle: nextHandleRaw,
    })
    .eq("id", user.id);

  if (upErr) {
    const msg = upErr.message.toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Такое название канала уже занято." }, { status: 409 });
    }
    return NextResponse.json({ error: upErr.message || "Не удалось сохранить." }, { status: 400 });
  }

  if (handleChanged) {
    await supabase.from("channel_handle_changes").insert({
      user_id: user.id,
      old_handle: oldHandle,
      new_handle: nextHandleRaw,
    });
  }

  return NextResponse.json({
    ok: true,
    channel_name: nextName,
    channel_handle: nextHandleRaw,
  });
}
