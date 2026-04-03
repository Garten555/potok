/** Человекочитаемые подписи к значениям status в public.reports */
export const REPORT_STATUS_LABELS: Record<string, string> = {
  open: "Открыта",
  reviewing: "На рассмотрении",
  resolved: "Закрыта",
  dismissed: "Отклонена",
};

export function reportStatusLabelRu(code: string | null | undefined): string {
  if (!code) return "—";
  return REPORT_STATUS_LABELS[code] ?? code;
}
