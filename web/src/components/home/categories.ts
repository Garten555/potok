/** Категории фильтра ленты (id — для будущего API). */
export const HOME_FEED_CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "games", label: "Видеоигры" },
  { id: "music", label: "Музыка" },
  { id: "recent", label: "Недавно опубликованные" },
  { id: "movies", label: "Фильмы и сериалы" },
  { id: "sport", label: "Спорт" },
  { id: "education", label: "Обучение" },
  { id: "comedy", label: "Комедия" },
  { id: "tech", label: "Технологии" },
  { id: "podcasts", label: "Подкасты" },
] as const;

export type HomeCategoryId = (typeof HOME_FEED_CATEGORIES)[number]["id"];
