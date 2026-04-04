import type { SupabaseClient } from "@supabase/supabase-js";
import { pusherServer } from "@/lib/pusher/server";
import { sendModerationNoticeEmailIfConfigured } from "@/lib/moderation-notify-email";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export async function resolveReportTargetOwnerId(
  svc: SupabaseClient,
  targetType: string,
  targetId: string,
): Promise<string | null> {
  if (targetType === "channel") return targetId;
  if (targetType === "video") {
    const { data } = await svc.from("videos").select("user_id").eq("id", targetId).maybeSingle();
    return (data as { user_id?: string } | null)?.user_id ?? null;
  }
  if (targetType === "comment") {
    const { data: c } = await svc.from("comments").select("video_id").eq("id", targetId).maybeSingle();
    const vid = (c as { video_id?: string } | null)?.video_id;
    if (!vid) return null;
    const { data: v } = await svc.from("videos").select("user_id").eq("id", vid).maybeSingle();
    return (v as { user_id?: string } | null)?.user_id ?? null;
  }
  return null;
}

type PenaltyKind = "report" | "upload_week" | "soft_freeze" | "hard_freeze";

export async function applyModerationPenaltiesAfterReport(
  svc: SupabaseClient,
  ownerId: string,
  opts?: { targetType?: string; reasonCode?: string },
): Promise<{ count: number; kind: PenaltyKind }> {
  const { data: countRaw, error: rpcErr } = await svc.rpc("count_active_reports_against_owner", {
    owner_id: ownerId,
  });
  if (rpcErr) {
    console.error("[moderation] count_active_reports_against_owner", rpcErr.message);
    return { count: 0, kind: "report" };
  }
  const count = typeof countRaw === "number" ? countRaw : Number(countRaw) || 0;

  const { data: row } = await svc
    .from("users")
    .select("upload_banned_until, moderation_soft_freeze_at, moderation_hard_freeze_until, moderation_no_appeal")
    .eq("id", ownerId)
    .maybeSingle();

  const prev = row as {
    upload_banned_until?: string | null;
    moderation_soft_freeze_at?: string | null;
    moderation_hard_freeze_until?: string | null;
    moderation_no_appeal?: boolean | null;
  } | null;

  const updates: Record<string, unknown> = {};
  let kind: PenaltyKind = "report";

  if (count >= 6) {
    const until = new Date(Date.now() + SIX_MONTHS_MS).toISOString();
    updates.moderation_hard_freeze_until = until;
    updates.moderation_no_appeal = true;
    if (!prev?.moderation_soft_freeze_at) {
      updates.moderation_soft_freeze_at = new Date().toISOString();
    }
    kind = "hard_freeze";
  } else if (count >= 3) {
    if (!prev?.moderation_soft_freeze_at) {
      updates.moderation_soft_freeze_at = new Date().toISOString();
    }
    kind = "soft_freeze";
  } else if (count >= 2) {
    const proposedEnd = Date.now() + WEEK_MS;
    const prevEnd = prev?.upload_banned_until ? new Date(prev.upload_banned_until).getTime() : 0;
    const nextEnd = Math.max(proposedEnd, prevEnd > Date.now() ? prevEnd : proposedEnd);
    updates.upload_banned_until = new Date(nextEnd).toISOString();
    kind = "upload_week";
  }

  if (Object.keys(updates).length > 0) {
    const { error: upErr } = await svc.from("users").update(updates).eq("id", ownerId);
    if (upErr) {
      console.error("[moderation] users update", upErr.message);
      return { count, kind: "report" };
    }
  }

  let email: string | null = null;
  try {
    const { data: authData, error: authErr } = await svc.auth.admin.getUserById(ownerId);
    if (!authErr) {
      email = authData.user?.email ?? null;
    }
  } catch {
    /* нет service role или API недоступен */
  }

  if (email) {
    await sendModerationNoticeEmailIfConfigured({
      to: email,
      count,
      kind,
      targetType: opts?.targetType,
      reasonCode: opts?.reasonCode,
    });
  }

  try {
    await pusherServer.trigger(`user-${ownerId}`, "moderation:updated", {
      userId: ownerId,
      count,
      kind,
    });
  } catch {
    /* Pusher не настроен */
  }

  return { count, kind };
}
