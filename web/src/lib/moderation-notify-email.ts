import nodemailer from "nodemailer";

type NoticeKind = "report" | "upload_week" | "soft_freeze" | "hard_freeze";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE !== "false";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function subjectAndBody(params: {
  count: number;
  kind: NoticeKind;
  targetType?: string;
  reasonCode?: string;
}): { subject: string; text: string; html: string } {
  const ctx = [params.targetType && `объект: ${params.targetType}`, params.reasonCode && `причина: ${params.reasonCode}`]
    .filter(Boolean)
    .join("; ");
  const tail = ctx ? `\n\n${ctx}` : "";

  if (params.kind === "hard_freeze") {
    return {
      subject: "ПОТОК: жёсткая блокировка канала",
      text: `Зафиксировано ${params.count} активных жалоб по вашему каналу. Канал скрыт от публики на 6 месяцев; апелляция по этому решению недоступна.${tail}\n\nПравила: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/rules`,
      html: `<p>Зафиксировано <strong>${params.count}</strong> активных жалоб по вашему каналу.</p><p>Канал скрыт от публики на <strong>6 месяцев</strong>; апелляция по этому решению недоступна.</p>${ctx ? `<p style="color:#666;font-size:13px">${ctx}</p>` : ""}<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/rules">Правила сервиса</a></p>`,
    };
  }
  if (params.kind === "soft_freeze") {
    return {
      subject: "ПОТОК: канал скрыт по жалобам",
      text: `По вашему каналу поступило несколько жалоб (${params.count} учитываемых). Канал временно скрыт от зрителей; подписчики сохраняются. Вы можете обжаловать решение через поддержку.${tail}\n\n/rules`,
      html: `<p>По вашему каналу накопилось <strong>${params.count}</strong> учитываемых жалоб.</p><p>Канал <strong>временно скрыт</strong> от зрителей; подписчики сохраняются.</p><p>Обжалование возможно через поддержку.</p>${ctx ? `<p style="color:#666;font-size:13px">${ctx}</p>` : ""}`,
    };
  }
  if (params.kind === "upload_week") {
    return {
      subject: "ПОТОК: ограничение загрузки видео",
      text: `По вашему каналу поступили жалобы (${params.count} учитываемых). Загрузка новых видео ограничена примерно на неделю.${tail}`,
      html: `<p>Учитываемых жалоб: <strong>${params.count}</strong>.</p><p>Загрузка новых видео <strong>ограничена примерно на неделю</strong>.</p>${ctx ? `<p style="color:#666;font-size:13px">${ctx}</p>` : ""}`,
    };
  }
  return {
    subject: "ПОТОК: получена жалоба",
    text: `Мы зафиксировали жалобу на ваш контент.${tail}\n\nЕсли жалоб накопится больше, возможны ограничения по правилам сервиса.`,
    html: `<p>Мы зафиксировали жалобу на ваш контент.</p>${ctx ? `<p style="color:#666;font-size:13px">${ctx}</p>` : ""}<p>Подробнее — в <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/rules">правилах</a>.</p>`,
  };
}

export async function sendModerationNoticeEmailIfConfigured(params: {
  to: string;
  count: number;
  kind: NoticeKind;
  targetType?: string;
  reasonCode?: string;
}): Promise<void> {
  const transport = getTransport();
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME ?? "ПОТОК";
  if (!transport || !fromEmail) {
    if (process.env.NODE_ENV === "development") {
      console.log("[moderation email skipped]", params.kind, params.count);
    }
    return;
  }
  const { subject, text, html } = subjectAndBody(params);
  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: params.to,
    subject,
    text,
    html,
  });
}
