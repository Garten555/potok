import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Сводка для дашборда админки (модератор + админ). */
export async function GET() {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  const svc = createSupabaseServiceClient();

  const [
    openRes,
    reviewingRes,
    resolvedRes,
    dismissedRes,
    resolvedWeekRes,
    usersTotalRes,
    videosTotalRes,
    verifiedRes,
  ] = await Promise.all([
    svc.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    svc.from("reports").select("id", { count: "exact", head: true }).eq("status", "reviewing"),
    svc.from("reports").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    svc.from("reports").select("id", { count: "exact", head: true }).eq("status", "dismissed"),
    svc
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    svc.from("users").select("id", { count: "exact", head: true }),
    svc.from("videos").select("id", { count: "exact", head: true }),
    svc.from("users").select("id", { count: "exact", head: true }).eq("channel_verified", true),
  ]);

  let pendingUnfreeze: number | null = null;
  if (gate.role === "admin") {
    const u = await svc
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("unfreeze_request_status", "pending")
      .not("account_frozen_at", "is", null);
    pendingUnfreeze = u.count ?? 0;
  }

  return NextResponse.json({
    reports_open: openRes.count ?? 0,
    reports_reviewing: reviewingRes.count ?? 0,
    reports_last_7d: resolvedWeekRes.count ?? 0,
    reports_by_status: {
      open: openRes.count ?? 0,
      reviewing: reviewingRes.count ?? 0,
      resolved: resolvedRes.count ?? 0,
      dismissed: dismissedRes.count ?? 0,
    },
    users_total: usersTotalRes.count ?? 0,
    videos_total: videosTotalRes.count ?? 0,
    verified_channels: verifiedRes.count ?? 0,
    pending_unfreeze: pendingUnfreeze,
    viewerRole: gate.role,
  });
}
