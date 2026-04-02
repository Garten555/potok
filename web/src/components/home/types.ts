/** Данные превью видео для карточек на главной (позже — из API / Supabase). */
export type VideoPreview = {
  id: string | number;
  title: string;
  /** Строка вида «12K просмотров • 3 ч назад» */
  meta?: string;
  /** Доп. строка под превью (например, «886 смотрят сейчас») */
  subtitle?: string;
};
