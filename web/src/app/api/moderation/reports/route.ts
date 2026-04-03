import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReportRow = Record<string, unknown>;

export async function GET(req: Request) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;
  const viewerRole = gate.role ?? null;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const reason = url.searchParams.get("reason") ?? "";
  const targetType = url.searchParams.get("target_type") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const channelRaw = (url.searchParams.get("channel") ?? "").trim();

  const svc = createSupabaseServiceClient();

  let channelUserId: string | null = null;
  if (channelRaw) {
    if (channelRaw.startsWith("@")) {
      const handle = channelRaw.slice(1).replace(/[%_]/g, "").slice(0, 80);
      if (handle.length < 1) {
        return NextResponse.json({ error: "Укажите ник после @" }, { status: 400 });
      }
      const { data: u } = await svc.from("users").select("id").ilike("channel_handle", handle).maybeSingle();
      channelUserId = (u as { id?: string } | null)?.id ?? null;
    } else if (UUID_RE.test(channelRaw)) {
      channelUserId = channelRaw;
    } else {
      return NextResponse.json(
        { error: "Канал: UUID владельца или @handle (например @mychannel)" },
        { status: 400 },
      );
    }
    if (!channelUserId) {
      return NextResponse.json({ error: "Канал с таким @handle не найден" }, { status: 404 });
    }
  }

  /** Жалобы, связанные с каналом: на сам канал, на ролики канала, на комментарии под этими роликами. */
  async function reportsForChannel(ownerId: string): Promise<ReportRow[]> {
    const { data: videos } = await svc.from("videos").select("id").eq("user_id", ownerId);
    const videoIds = (videos ?? []).map((v) => (v as { id: string }).id);

    const { data: chReports } = await svc
      .from("reports")
      .select("*")
      .eq("target_type", "channel")
      .eq("target_id", ownerId);

    const videoPromise =
      videoIds.length > 0
        ? svc.from("reports").select("*").eq("target_type", "video").in("target_id", videoIds)
        : Promise.resolve({ data: [] as ReportRow[] });

    const commentsPromise =
      videoIds.length > 0
        ? svc.from("comments").select("id").in("video_id", videoIds)
        : Promise.resolve({ data: [] as { id: string }[] });

    const [vr, cr] = await Promise.all([videoPromise, commentsPromise]);
    const commentIds = (cr.data ?? []).map((c) => c.id);
    const commentPromise =
      commentIds.length > 0
        ? svc.from("reports").select("*").eq("target_type", "comment").in("target_id", commentIds)
        : Promise.resolve({ data: [] as ReportRow[] });

    const { data: commentReports } = await commentPromise;

    const merged = [...(chReports ?? []), ...(vr.data ?? []), ...(commentReports ?? [])];
    const uniq = new Map<string, ReportRow>();
    for (const r of merged) {
      const id = String((r as { id: string }).id);
      uniq.set(id, r);
    }
    return Array.from(uniq.values()).sort(
      (a, b) =>
        new Date(String((b as { created_at: string }).created_at)).getTime() -
        new Date(String((a as { created_at: string }).created_at)).getTime(),
    );
  }

  let list: ReportRow[];

  if (channelUserId) {
    list = await reportsForChannel(channelUserId);
  } else {
    let query = svc.from("reports").select("*").order("created_at", { ascending: false }).limit(400);
    if (status && ["open", "reviewing", "resolved", "dismissed"].includes(status)) {
      query = query.eq("status", status);
    }
    if (reason) {
      query = query.eq("reason_code", reason);
    }
    if (targetType && ["video", "comment", "channel"].includes(targetType)) {
      query = query.eq("target_type", targetType);
    }
    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    list = rows ?? [];
  }

  if (channelUserId) {
    if (status && ["open", "reviewing", "resolved", "dismissed"].includes(status)) {
      list = list.filter((r) => String((r as { status: string }).status) === status);
    }
    if (reason) {
      list = list.filter((r) => String((r as { reason_code: string }).reason_code) === reason);
    }
    if (targetType && ["video", "comment", "channel"].includes(targetType)) {
      list = list.filter((r) => String((r as { target_type: string }).target_type) === targetType);
    }
  }

  if (q) {
    list = list.filter((r) => {
      const reasonCode = String((r as { reason_code?: string }).reason_code ?? "").toLowerCase();
      const details = String((r as { details?: string }).details ?? "").toLowerCase();
      const note = String((r as { resolution_note?: string }).resolution_note ?? "").toLowerCase();
      const tid = String((r as { target_id?: string }).target_id ?? "").toLowerCase();
      return (
        reasonCode.includes(q) || details.includes(q) || note.includes(q) || tid.includes(q)
      );
    });
  }

  return NextResponse.json({ reports: list, viewerRole, channel_filter: channelUserId });
}
