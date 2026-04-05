import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff-auth";
import type {
  ModerationCommentContext,
  ModerationReportRow,
  ModerationReportsListErrorBody,
  ModerationReportsListResponse,
} from "@/lib/moderation-reports-types";
import { parseAdminUserSearchQuery } from "@/lib/admin-user-search";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type ReportRecord = Record<string, unknown>;

const PARENT_SNIPPET_LEN = 160;

function snippet(text: string, max = PARENT_SNIPPET_LEN): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

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

  const commentTargetIds = [
    ...new Set(
      list
        .filter((r) => String((r as { target_type?: string }).target_type) === "comment")
        .map((r) => String((r as { target_id?: string }).target_id)),
    ),
  ];

  let commentTextById = new Map<string, string>();
  if (commentTargetIds.length > 0) {
    const { data: commentRows } = await svc
      .from("comments")
      .select("id, content")
      .in("id", commentTargetIds);
    for (const row of commentRows ?? []) {
      const id = String((row as { id: string }).id);
      const content = String((row as { content?: string }).content ?? "");
      commentTextById.set(id, content);
    }
  }

  if (q) {
    list = list.filter((r) => {
      const reasonCode = String((r as { reason_code?: string }).reason_code ?? "").toLowerCase();
      const details = String((r as { details?: string }).details ?? "").toLowerCase();
      const note = String((r as { resolution_note?: string }).resolution_note ?? "").toLowerCase();
      const tid = String((r as { target_id?: string }).target_id ?? "").toLowerCase();
      const ttype = String((r as { target_type?: string }).target_type);
      const commentBody =
        ttype === "comment"
          ? (commentTextById.get(String((r as { target_id?: string }).target_id)) ?? "").toLowerCase()
          : "";
      return (
        reasonCode.includes(q) ||
        details.includes(q) ||
        note.includes(q) ||
        tid.includes(q) ||
        commentBody.includes(q)
      );
    });
  }

  const total = list.length;
  const start = (page - 1) * limit;
  const paginated = list.slice(start, start + limit);

  const pageCommentIds = [
    ...new Set(
      paginated
        .filter((r) => String((r as { target_type?: string }).target_type) === "comment")
        .map((r) => String((r as { target_id?: string }).target_id)),
    ),
  ];

  let enrichedReports: ModerationReportRow[] = paginated as ModerationReportRow[];

  if (pageCommentIds.length > 0) {
    const { data: cRows } = await svc
      .from("comments")
      .select("id, content, video_id, user_id, parent_id")
      .in("id", pageCommentIds);

    const byComment = new Map<string, { content: string; video_id: string; user_id: string; parent_id: string | null }>();
    const parentIds = new Set<string>();
    for (const row of cRows ?? []) {
      const o = row as {
        id: string;
        content: string;
        video_id: string;
        user_id: string;
        parent_id: string | null;
      };
      byComment.set(o.id, {
        content: o.content,
        video_id: o.video_id,
        user_id: o.user_id,
        parent_id: o.parent_id,
      });
      if (o.parent_id) parentIds.add(o.parent_id);
    }

    const videoIds = [...new Set([...byComment.values()].map((c) => c.video_id))];
    const authorIds = [...new Set([...byComment.values()].map((c) => c.user_id))];

    const [{ data: videos }, { data: users }, { data: parents }] = await Promise.all([
      videoIds.length
        ? svc.from("videos").select("id, title").in("id", videoIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      authorIds.length
        ? svc.from("users").select("id, channel_handle, channel_name").in("id", authorIds)
        : Promise.resolve({ data: [] as { id: string; channel_handle: string | null; channel_name: string }[] }),
      parentIds.size
        ? svc.from("comments").select("id, content").in("id", [...parentIds])
        : Promise.resolve({ data: [] as { id: string; content: string }[] }),
    ]);

    const titleByVideo = new Map((videos ?? []).map((v) => [String((v as { id: string }).id), String((v as { title?: string }).title ?? "")]));
    const authorDisplayByUser = new Map<string, string | null>(
      (users ?? []).map((u) => {
        const row = u as { id: string; channel_handle: string | null; channel_name: string };
        const h = row.channel_handle?.trim();
        const name = row.channel_name?.trim();
        const display = h && h.length > 0 ? `@${h}` : name && name.length > 0 ? name : null;
        return [String(row.id), display];
      }),
    );
    const parentSnippet = new Map(
      (parents ?? []).map((p) => {
        const row = p as { id: string; content: string };
        return [String(row.id), snippet(row.content)] as [string, string];
      }),
    );

    enrichedReports = paginated.map((r) => {
      const row = r as ReportRecord & { target_type?: string; target_id?: string };
      if (row.target_type !== "comment") {
        return r as ModerationReportRow;
      }
      const cid = String(row.target_id ?? "");
      const c = byComment.get(cid);
      if (!c) {
        return { ...(r as ModerationReportRow), moderation_context: null };
      }
      const titleRaw = titleByVideo.get(c.video_id) ?? "";
      const ctx: ModerationCommentContext = {
        comment_content: c.content,
        video_id: c.video_id,
        video_title: titleRaw.trim() ? titleRaw : null,
        comment_author_display: authorDisplayByUser.get(c.user_id) ?? null,
        parent_comment_snippet: c.parent_id ? parentSnippet.get(c.parent_id) ?? null : null,
      };
      return { ...(r as ModerationReportRow), moderation_context: ctx };
    });
  }

  const body: ModerationReportsListResponse = {
    reports: enrichedReports,
    total,
    page,
    pageSize: limit,
    viewerRole,
    channel_filter: channelUserId,
  };
  return NextResponse.json(body);
}
