import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;
  const viewerRole = gate.role ?? null;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const reason = url.searchParams.get("reason") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const svc = createSupabaseServiceClient();
  let query = svc.from("reports").select("*").order("created_at", { ascending: false }).limit(300);

  if (status && ["open", "reviewing", "resolved", "dismissed"].includes(status)) {
    query = query.eq("status", status);
  }
  if (reason) {
    query = query.eq("reason_code", reason);
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let list = rows ?? [];
  if (q) {
    list = list.filter((r) => {
      const reasonCode = String((r as { reason_code?: string }).reason_code ?? "").toLowerCase();
      const details = String((r as { details?: string }).details ?? "").toLowerCase();
      const note = String((r as { resolution_note?: string }).resolution_note ?? "").toLowerCase();
      return reasonCode.includes(q) || details.includes(q) || note.includes(q);
    });
  }

  return NextResponse.json({ reports: list, viewerRole });
}
