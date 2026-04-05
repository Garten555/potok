/**
 * Типы для GET /api/moderation/reports и клиента раздела «Жалобы».
 */

/** Контекст для жалобы на комментарий (подгружается сервером для админки). */
export type ModerationCommentContext = {
  comment_content: string;
  video_id: string;
  video_title: string | null;
  /** Для карточки в админке: @handle или название канала */
  comment_author_display: string | null;
  /** Короткий фрагмент родительского комментария, если это ответ */
  parent_comment_snippet: string | null;
};

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
  /** Заполняется для target_type === "comment" */
  moderation_context?: ModerationCommentContext | null;
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
