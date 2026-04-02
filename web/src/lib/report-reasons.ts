/** Коды причин жалоб (единый список для UI, API и поиска в админке). */
export const REPORT_REASON_CODES = [
  { code: "spam", label: "Спам / реклама" },
  { code: "harassment", label: "Оскорбления / травля" },
  { code: "hate", label: "Ненависть / дискриминация" },
  { code: "nsfw", label: "NSFW / насилие" },
  { code: "copyright", label: "Нарушение авторских прав" },
  { code: "misinformation", label: "Дезинформация" },
  { code: "other", label: "Другое" },
] as const;

export type ReportReasonCode = (typeof REPORT_REASON_CODES)[number]["code"];

export function reportReasonLabel(code: string): string {
  return REPORT_REASON_CODES.find((r) => r.code === code)?.label ?? code;
}
