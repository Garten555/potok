import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendRecoveryOtpEmail } from "@/lib/mail";

export const runtime = "nodejs";

function siteUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Генерирует recovery OTP через Supabase Admin и отправляет письмо через SMTP из .env
 * (обходит встроенную отправку Supabase).
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const base = siteUrl(request);

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Введите корректный email." }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Сервер не настроен (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${base}/auth/reset-password`,
      },
    });

    if (error || !data?.properties?.email_otp) {
      // Не раскрываем, есть ли пользователь
      return NextResponse.json({ ok: true });
    }

    await sendRecoveryOtpEmail(email, data.properties.email_otp);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка отправки";
    console.error("[send-recovery]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
