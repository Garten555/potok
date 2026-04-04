import { NextResponse } from "next/server";
import { z } from "zod";
import { pusherServer } from "@/lib/pusher/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USER_NOTIFICATIONS_EVENT, userNotificationsChannelName } from "@/lib/pusher/user-notifications";

const bodySchema = z.object({
  targetUserId: z.string().uuid(),
});

/**
 * Триггерит Pusher на канале получателя (например после ответа на комментарий).
 * Требует авторизацию; не шлёт себе.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { targetUserId } = parsed.data;
  if (targetUserId === user.id) {
    return NextResponse.json({ ok: true, skipped: "self" });
  }

  try {
    await pusherServer.trigger(userNotificationsChannelName(targetUserId), USER_NOTIFICATIONS_EVENT, {
      source: "client",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Pusher failed" },
      { status: 500 },
    );
  }
}
