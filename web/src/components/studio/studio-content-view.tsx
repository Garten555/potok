"use client";

import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { Search, Trash2 } from "lucide-react";

type Visibility = "public" | "unlisted" | "private";

export type StudioContentItem = {
  id: string;
  title: string;
  description: string | null;
  tags?: string[] | null;
  created_at: string;
  visibility?: Visibility;
  views?: number;
  thumbnail_url?: string | null;
  category_id?: string | null;
  /** Предупреждение о вспышках / эпилепсии на странице просмотра */
  photosensitive_warning?: boolean;
};

export type EditVideoFieldErrors = {
  title?: string;
  description?: string;
  tags?: string;
  categoryId?: string;
};

type CategoryItem = { id: string; name: string };

function stopPlayerHotkeys(
  event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
  event.stopPropagation();
}

function getCategoryIcon(name: string): string {
  const value = name.toLowerCase();
  if (value.includes("игр") || value.includes("game")) return "🎮";
  if (value.includes("музык") || value.includes("music")) return "🎵";
  if (value.includes("фильм") || value.includes("сериал") || value.includes("movie")) return "🎬";
  if (value.includes("спорт") || value.includes("sport")) return "🏅";
  if (value.includes("образ") || value.includes("education") || value.includes("обуч")) return "🎓";
  if (value.includes("комед") || value.includes("юмор") || value.includes("comedy")) return "😂";
  if (value.includes("техн") || value.includes("tech")) return "💻";
  return "📁";
}

export type StudioContentViewProps = {
  contentItems: StudioContentItem[];
  /** Всего загружено (до поиска/фильтра) */
  contentTotalCount: number;
  studioContentQuery: string;
  setStudioContentQuery: (v: string) => void;
  studioContentVisibility: "all" | Visibility;
  setStudioContentVisibility: (v: "all" | Visibility) => void;
  categories: CategoryItem[];
  editingVideoId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editTagsInput: string;
  setEditTagsInput: (v: string) => void;
  editCategoryId: string;
  setEditCategoryId: (v: string) => void;
  editVisibility: Visibility;
  setEditVisibility: (v: Visibility) => void;
  editPhotosensitiveWarning: boolean;
  setEditPhotosensitiveWarning: (v: boolean) => void;
  editSaving: boolean;
  editError: string;
  editFieldErrors: EditVideoFieldErrors;
  setEditThumbnailFile: (f: File | null) => void;
  onOpenEdit: (item: StudioContentItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeleteVideo: (videoId: string) => void;
  deletingVideoId: string | null;
};

export function StudioContentView({
  contentItems,
  contentTotalCount,
  studioContentQuery,
  setStudioContentQuery,
  studioContentVisibility,
  setStudioContentVisibility,
  categories,
  editingVideoId,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editTagsInput,
  setEditTagsInput,
  editCategoryId,
  setEditCategoryId,
  editVisibility,
  setEditVisibility,
  editPhotosensitiveWarning,
  setEditPhotosensitiveWarning,
  editSaving,
  editError,
  editFieldErrors,
  setEditThumbnailFile,
  onOpenEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteVideo,
  deletingVideoId,
}: StudioContentViewProps) {
  const showFilterEmpty = contentTotalCount > 0 && contentItems.length === 0;

  return (
    <section className="mx-auto w-full max-w-[1600px] rounded-2xl border border-white/10 bg-[#10182a] p-3 sm:p-4 md:p-5 lg:p-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl md:text-3xl">Ваши видео</h1>
      <p className="mt-2 text-sm text-slate-400 sm:text-base">
        Просмотры, видимость, описание и редактирование после публикации.
      </p>

      {contentTotalCount > 0 ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[200px] flex-1 space-y-1">
            <span className="text-xs text-slate-400">Поиск</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={studioContentQuery}
                onChange={(e) => setStudioContentQuery(e.target.value)}
                onKeyDownCapture={stopPlayerHotkeys}
                placeholder="Название, описание, теги…"
                className="w-full rounded-lg border border-white/10 bg-[#0b1120] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
              />
            </span>
          </label>
          <label className="block w-full min-w-[180px] space-y-1 sm:max-w-[220px]">
            <span className="text-xs text-slate-400">Видимость</span>
            <select
              value={studioContentVisibility}
              onChange={(e) => setStudioContentVisibility(e.target.value as "all" | Visibility)}
              onKeyDownCapture={stopPlayerHotkeys}
              className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
            >
              <option value="all">Все</option>
              <option value="public">Публичные</option>
              <option value="unlisted">По ссылке</option>
              <option value="private">Приватные</option>
            </select>
          </label>
          <p className="text-xs text-slate-500 sm:ml-auto">
            Показано {contentItems.length} из {contentTotalCount}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 sm:gap-5">
        {showFilterEmpty ? (
          <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Ничего не подошло под фильтр — измените поиск или сбросьте видимость.
          </p>
        ) : null}
        {contentItems.length > 0 ? (
          contentItems.map((item) => {
            const isEditing = editingVideoId === item.id;
            const categoryName = item.category_id
              ? categories.find((c) => c.id === item.category_id)?.name
              : null;
            return (
              <div key={item.id} className="w-full rounded-xl border border-white/10 bg-[#0c1323]/80 p-4 sm:p-5">
                <div className="grid w-full grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full min-h-[140px] items-center justify-center text-sm text-slate-500 sm:min-h-[160px]">
                        Нет превью
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center gap-2 sm:gap-2.5">
                    <Link
                      href={`/watch/${item.id}`}
                      className="text-lg font-semibold leading-snug text-slate-100 hover:text-cyan-200 sm:text-xl md:text-2xl"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                      {new Date(item.created_at).toLocaleString("ru-RU")} · {(item.views ?? 0).toLocaleString("ru-RU")}{" "}
                      просмотров
                      {categoryName ? ` · ${categoryName}` : ""}
                    </p>
                    <p className="text-sm text-cyan-200/90 sm:text-base">
                      {item.visibility === "private"
                        ? "Приватное"
                        : item.visibility === "unlisted"
                          ? "По ссылке"
                          : "Публичное"}
                      {item.photosensitive_warning ? (
                        <span className="ml-2 rounded border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-100">
                          Вспышки
                        </span>
                      ) : null}
                    </p>
                    {item.description ? (
                      <p className="line-clamp-4 text-base leading-relaxed text-slate-300 sm:line-clamp-5 sm:text-[1.05rem]">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-base text-slate-500 sm:text-[1.05rem]">Нет описания</p>
                    )}
                    {item.tags && item.tags.length > 0 ? (
                      <p className="text-sm text-slate-500">
                        {(item.tags as string[]).map((t) => `#${t}`).join(" ")}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1 sm:pt-2">
                      <button
                        type="button"
                        onClick={() => (isEditing ? onCancelEdit() : onOpenEdit(item))}
                        className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.1] sm:px-5 sm:text-base"
                      >
                        {isEditing ? "Отмена" : "Редактировать"}
                      </button>
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => onDeleteVideo(item.id)}
                          disabled={deletingVideoId === item.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-400/35 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          {deletingVideoId === item.id ? "Удаление…" : "Удалить видео"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-5 space-y-3 border-t border-white/10 pt-5 sm:mt-6 sm:pt-6">
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-400">Название</span>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDownCapture={stopPlayerHotkeys}
                        className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                      />
                      {editFieldErrors.title ? <span className="text-xs text-rose-300">{editFieldErrors.title}</span> : null}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-400">Описание</span>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        onKeyDownCapture={stopPlayerHotkeys}
                        rows={4}
                        className="w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                      />
                      {editFieldErrors.description ? (
                        <span className="text-xs text-rose-300">{editFieldErrors.description}</span>
                      ) : null}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-400">Теги (хэштеги)</span>
                      <input
                        value={editTagsInput}
                        onChange={(e) => setEditTagsInput(e.target.value)}
                        onKeyDownCapture={stopPlayerHotkeys}
                        className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                        placeholder="#игры обзор или через запятую"
                        autoComplete="off"
                      />
                      {editFieldErrors.tags ? (
                        <span className="text-xs text-rose-300">{editFieldErrors.tags}</span>
                      ) : null}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-400">Категория</span>
                      <select
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        onKeyDownCapture={stopPlayerHotkeys}
                        className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                      >
                        <option value="">Выберите категорию</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {getCategoryIcon(category.name)} {category.name}
                          </option>
                        ))}
                      </select>
                      {editFieldErrors.categoryId ? (
                        <span className="text-xs text-rose-300">{editFieldErrors.categoryId}</span>
                      ) : null}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-400">Доступ к видео</span>
                      <select
                        value={editVisibility}
                        onChange={(e) => setEditVisibility(e.target.value as Visibility)}
                        onKeyDownCapture={stopPlayerHotkeys}
                        className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                      >
                        <option value="public">Публичное</option>
                        <option value="unlisted">Доступ по ссылке</option>
                        <option value="private">Приватное</option>
                      </select>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={editPhotosensitiveWarning}
                        onChange={(e) => setEditPhotosensitiveWarning(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0b1120] text-cyan-500 focus:ring-cyan-400/40"
                      />
                      <span className="text-sm leading-snug text-amber-100/95">
                        Предупреждение о вспышках / фоточувствительности (эпилепсия)
                      </span>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-400">Новая обложка (необязательно)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setEditThumbnailFile(e.target.files?.[0] ?? null)}
                        className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-cyan-100"
                      />
                    </label>
                    {editError ? <p className="text-xs text-rose-300">{editError}</p> : null}
                    <button
                      type="button"
                      onClick={onSaveEdit}
                      disabled={editSaving}
                      className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
                    >
                      {editSaving ? "Сохранение..." : "Сохранить изменения"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : contentTotalCount === 0 && !showFilterEmpty ? (
          <p className="text-sm text-slate-400">Пока нет загруженных видео.</p>
        ) : null}
      </div>
    </section>
  );
}
