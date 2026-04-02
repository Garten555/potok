import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

async function requireStaff() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  const { data: row } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const role = (row as { role?: string } | null)?.role;
  if (role !== "moderator" && role !== "admin") {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate && gate.error) return gate.error;

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

  return NextResponse.json({ reports: list });
}
