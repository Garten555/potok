import { NextResponse } from "next/server";
import { z } from "zod";
import { pusherServer } from "@/lib/pusher/server";

const payloadSchema = z.object({
  channel: z.string().min(1),
  event: z.string().min(1),
  // Можно отправлять произвольный JSON (для реакций/вьюсов/комментов).
  payload: z.unknown().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const { channel, event, payload } = parsed.data;

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

