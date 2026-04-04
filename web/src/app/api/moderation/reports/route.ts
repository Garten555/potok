import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff-auth";
import type {
  ModerationReportRow,
  ModerationReportsListErrorBody,
  ModerationReportsListResponse,
} from "@/lib/moderation-reports-types";
import { parseAdminUserSearchQuery } from "@/lib/admin-user-search";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type ReportRecord = Record<string, unknown>;

function jsonError(message: string, status: number) {
  const body: ModerationReportsListErrorBody = { error: message };
  return NextResponse.json(body, { status });
}

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
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(5, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));

  const svc = createSupabaseServiceClient();

  let channelUserId: string | null = null;
  if (channelRaw) {
    const parsed = parseAdminUserSearchQuery(channelRaw);
    if (!parsed) {
      return jsonError("Для фильтра по каналу укажите @handle или минимум 2 символа названия / ника канала.", 400);
    }
    const like = `%${parsed.term}%`;
    const [byName, byHandle] = await Promise.all([
      svc.from("users").select("id").ilike("channel_name", like),
      svc.from("users").select("id").ilike("channel_handle", like),
    ]);
    const nameErr = byName.error;
    const handleErr = byHandle.error;
    if (nameErr || handleErr) {
      return jsonError(nameErr?.message ?? handleErr?.message ?? "Ошибка запроса", 400);
    }
    const rows = [...(byName.data ?? []), ...(byHandle.data ?? [])];
    const uniqIds = [...new Set(rows.map((r) => (r as { id: string }).id))];
    if (uniqIds.length === 0) {
      return jsonError("Канал не найден по названию или нику (проверьте написание)", 404);
    }
    if (uniqIds.length > 1) {
      return jsonError(
        `Найдено несколько каналов (${uniqIds.length}) по этой подстроке. Уточните полный @handle (как в URL канала).`,
        400,
      );
    }
    channelUserId = uniqIds[0];
    if (!channelUserId) {
      return jsonError("Канал не найден по этому запросу.", 404);
    }
  }

  /** Жалобы, связанные с каналом: на сам канал, на ролики канала, на комментарии под этими роликами. */
  async function reportsForChannel(ownerId: string): Promise<ReportRecord[]> {
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
        : Promise.resolve({ data: [] as ReportRecord[] });

    const commentsPromise =
      videoIds.length > 0
        ? svc.from("comments").select("id").in("video_id", videoIds)
        : Promise.resolve({ data: [] as { id: string }[] });

    const [vr, cr] = await Promise.all([videoPromise, commentsPromise]);
    const commentIds = (cr.data ?? []).map((c) => c.id);
    const commentPromise =
      commentIds.length > 0
        ? svc.from("reports").select("*").eq("target_type", "comment").in("target_id", commentIds)
        : Promise.resolve({ data: [] as ReportRecord[] });

    const { data: commentReports } = await commentPromise;

    const merged = [...(chReports ?? []), ...(vr.data ?? []), ...(commentReports ?? [])];
    const uniq = new Map<string, ReportRecord>();
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

  let list: ReportRecord[];

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
      return jsonError(error.message, 400);
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

  const total = list.length;
  const start = (page - 1) * limit;
  const paginated = list.slice(start, start + limit);

  const body: ModerationReportsListResponse = {
    reports: paginated as ModerationReportRow[],
    total,
    page,
    pageSize: limit,
    viewerRole,
    channel_filter: channelUserId,
  };
  return NextResponse.json(body);
}
