import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseAdminUserSearchQuery } from "@/lib/admin-user-search";
import { requireStaff } from "@/lib/server/staff-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type UserRow = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
  role: string | null;
  banned_until: string | null;
  account_frozen_at: string | null;
  channel_verified: boolean | null;
};

const SELECT_FIELDS =
  "id, channel_name, channel_handle, avatar_url, role, banned_until, account_frozen_at, channel_verified";

async function emailForUserId(userId: string): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: auth } = await admin.auth.admin.getUserById(userId);
  return auth.user?.email ?? null;
}

/** Поиск по @handle или подстроке имени / handle (без UUID в запросе). */
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
  const parsed = parseAdminUserSearchQuery(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Минимум 2 символа: @handle (как на сайте) или часть ника / ника канала. UUID в поиске не используем." },
      { status: 400 },
    );
  }

  const svc = createSupabaseServiceClient();
  const term = parsed.term;
  const like = `%${term}%`;

  const { data: exactHandle, error: exErr } = await svc
    .from("users")
    .select(SELECT_FIELDS)
    .eq("channel_handle", term)
    .maybeSingle();
  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 400 });
  }
  if (exactHandle) {
    const email = await emailForUserId((exactHandle as UserRow).id);
    return NextResponse.json({ kind: "single" as const, user: exactHandle as UserRow, email });
  }

  const { data: byHandle, error: hErr } = await svc
    .from("users")
    .select(SELECT_FIELDS)
    .ilike("channel_handle", like)
    .limit(20);
  if (hErr) {
    return NextResponse.json({ error: hErr.message }, { status: 400 });
  }
  if (byHandle && byHandle.length === 1) {
    const u = byHandle[0] as UserRow;
    const email = await emailForUserId(u.id);
    return NextResponse.json({ kind: "single" as const, user: u, email });
  }
  if (byHandle && byHandle.length > 1) {
    return NextResponse.json({ kind: "list" as const, users: byHandle as UserRow[] });
  }

  const { data: byName, error: nErr } = await svc
    .from("users")
    .select(SELECT_FIELDS)
    .ilike("channel_name", like)
    .limit(20);
  if (nErr) {
    return NextResponse.json({ error: nErr.message }, { status: 400 });
  }
  if (byName && byName.length === 1) {
    const u = byName[0] as UserRow;
    const email = await emailForUserId(u.id);
    return NextResponse.json({ kind: "single" as const, user: u, email });
  }

  return NextResponse.json({ kind: "list" as const, users: (byName ?? []) as UserRow[] });
}
