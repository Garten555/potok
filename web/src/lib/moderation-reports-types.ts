/**
 * Типы для GET /api/moderation/reports и клиента раздела «Жалобы».
 */

/** Строка жалобы (public.reports), как приходит с API. */
export type ModerationReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason_code: string;
  details: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
  moderator_action: string | null;
};

/** Успешный JSON от GET /api/moderation/reports */
export type ModerationReportsListResponse = {
  reports: ModerationReportRow[];
  total: number;
  page: number;
  pageSize: number;
  viewerRole?: string | null;
  /** UUID владельца канала, если задан фильтр channel= */
  channel_filter?: string | null;
};

/** Тело ответа при ошибке (4xx/5xx) */
export type ModerationReportsListErrorBody = {
  error: string;
};
