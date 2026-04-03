import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type UserRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  role: string | null;
  banned_until: string | null;
  account_frozen_at: string | null;
};

/** Поиск пользователя по UUID, @handle или части handle / ника (для модерации). */
export async function POST(req: Request) {
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  let body: { q?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const raw = (body.q ?? "").trim();
  if (raw.length < 2) {
    return NextResponse.json({ error: "Минимум 2 символа" }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();

  if (UUID_RE.test(raw)) {
    const { data, error } = await svc
      .from("users")
      .select("id, channel_name, channel_handle, role, banned_until, account_frozen_at")
      .eq("id", raw)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    let email: string | null = null;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: auth } = await admin.auth.admin.getUserById(raw);
      email = auth.user?.email ?? null;
    }
    return NextResponse.json({ kind: "single" as const, user: data as UserRow | null, email });
  }

  const term = (raw.startsWith("@") ? raw.slice(1) : raw).replace(/[%_]/g, "").trim().slice(0, 80);
  if (term.length < 2) {
    return NextResponse.json({ error: "Минимум 2 символа без спецсимволов" }, { status: 400 });
  }
  const like = `%${term}%`;

  const { data: byHandle, error: hErr } = await svc
    .from("users")
    .select("id, channel_name, channel_handle, role, banned_until, account_frozen_at")
    .ilike("channel_handle", like)
    .limit(20);

  if (hErr) {
    return NextResponse.json({ error: hErr.message }, { status: 400 });
  }

  if (byHandle && byHandle.length > 0) {
    return NextResponse.json({ kind: "list" as const, users: byHandle as UserRow[] });
  }

  const { data: byName, error: nErr } = await svc
    .from("users")
    .select("id, channel_name, channel_handle, role, banned_until, account_frozen_at")
    .ilike("channel_name", like)
    .limit(20);

  if (nErr) {
    return NextResponse.json({ error: nErr.message }, { status: 400 });
  }

  return NextResponse.json({ kind: "list" as const, users: (byName ?? []) as UserRow[] });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
