/** Данные для карточек на главной канала и во вкладке «Видео». */
export type ChannelVideoItem = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  created_at: string;
};

/** Один горизонтальный ряд на главной (все видео или плейлист). */
export type ChannelHomeSectionResolved = {
  id: string | null;
  sectionKind: "uploads" | "playlist" | "spotlight";
  displayTitle: string;
  playlistId?: string;
  videos: ChannelVideoItem[];
  /** Ссылка «Воспроизвести всё» (плейлист: с ?list=, загрузки: первое видео). У spotlight всегда null. */
  playAllHref: string | null;
};

/** Строка из БД для редактора владельца. */
export type ChannelHomeLayoutRow = {
  id: string;
  position: number;
  sectionKind: "uploads" | "playlist" | "spotlight";
  playlistId: string | null;
  displayTitle: string | null;
};

/** Карточка плейлиста на странице канала (вкладка «Плейлисты» и настройка главной). */
export type ChannelPlaylistCard = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  created_at: string;
  videos_count: number;
  thumbnail_url: string | null;
  first_video_id: string | null;
};
