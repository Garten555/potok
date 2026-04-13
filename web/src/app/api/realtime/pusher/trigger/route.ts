import { NextResponse } from "next/server";
import { z } from "zod";
import { pusherServer } from "@/lib/pusher/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  channel: z.string().min(1),
  event: z.string().min(1),
  // Можно отправлять произвольный JSON (для реакций/вьюсов/комментов).
  payload: z.unknown().optional(),
});

const ALLOWED_EVENTS = new Set(["reactions:updated", "comments:updated", "community:posts_updated"]);
const ALLOWED_CHANNEL_RE = /^(video|community)-[a-zA-Z0-9-]+$/;

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const { channel, event, payload } = parsed.data;
  if (!ALLOWED_CHANNEL_RE.test(channel) || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ ok: false, error: "Forbidden channel/event" }, { status: 403 });
  }

  try {
    await pusherServer.trigger(channel, event, payload ?? {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Pusher trigger failed" },
      { status: 500 },
    );
  }
}

