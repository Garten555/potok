import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER и SMTP_PASSWORD должны быть заданы в .env.local");
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE !== "false";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendRecoveryOtpEmail(to: string, otp: string): Promise<void> {
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME ?? "POTOK";
  if (!fromEmail) {
    throw new Error("Задайте SMTP_FROM_EMAIL или SMTP_USER как адрес отправителя.");
  }

  const transport = getTransport();
  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: "Код для сброса пароля — POTOK",
    text: `Код для сброса пароля: ${otp}\n\nЕсли вы не запрашивали сброс, проигнорируйте это письмо.`,
    html: `<p>Код для сброса пароля:</p><p style="font-size:22px;font-weight:700;letter-spacing:0.2em">${otp}</p><p style="color:#666;font-size:13px">Если вы не запрашивали сброс, проигнорируйте это письмо.</p>`,
  });
}
