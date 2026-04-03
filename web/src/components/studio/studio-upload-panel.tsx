"use client";

import type { KeyboardEvent as ReactKeyboardEvent, Dispatch, RefObject, SetStateAction } from "react";
import clsx from "clsx";
import dynamic from "next/dynamic";
import type { SourceInfo } from "plyr";
import { plyrRuI18n } from "@/lib/plyr-ru";
import type { PlyrVideoHandle } from "@/components/video/plyr-video-types";

const PlyrVideo = dynamic(
  () => import("@/components/video/plyr-video").then((m) => m.PlyrVideo),
  { ssr: false },
);

type Visibility = "public" | "unlisted" | "private";

type CategoryItem = {
  id: string;
  name: string;
};

export type ThumbCandidate = {
  id: string;
  timeSec: number;
  file: File;
  previewUrl: string;
};

export type StudioUploadFieldErrors = {
  title?: string;
  description?: string;
  tags?: string;
  categoryId?: string;
  videoFile?: string;
  thumbnailFile?: string;
};

const MAX_VIDEO_TAGS = 20;
const MAX_VIDEO_TAG_LEN = 48;

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

function stopPlayerHotkeys(
  event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
  event.stopPropagation();
}

export type StudioUploadPanelProps = {
  frameVideoRef: RefObject<HTMLVideoElement | null>;
  studioPlyrRef: RefObject<PlyrVideoHandle | null>;
  videoFile: File | null;
  setVideoFile: (f: File | null) => void;
  replacePreviewFromFile: (f: File | null) => void;
  previewUrl: string;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  setIsCategoryManuallySelected: (v: boolean) => void;
  categories: CategoryItem[];
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  photosensitiveWarning: boolean;
  setPhotosensitiveWarning: (v: boolean) => void;
  uploadFieldErrors: StudioUploadFieldErrors;
  setUploadFieldErrors: Dispatch<SetStateAction<StudioUploadFieldErrors>>;
  thumbCandidates: ThumbCandidate[];
  isCapturingThumbs: boolean;
  selectedThumbCandidateId: string | null;
  setSelectedThumbCandidateId: (id: string | null) => void;
  setThumbnailFile: (f: File | null) => void;
  thumbCandidatesError: string;
  replaceThumbnailPreviewFromFile: (f: File | null) => void;
  error: string;
  success: string;
  source: SourceInfo | null;
  playerKey: number;
  handlePublish: () => void | Promise<void>;
  isPublishing: boolean;
  /** Синхронизация ref’ов превью и постера плеера в родителе. */
  onSelectThumbCandidate: (c: ThumbCandidate) => void;
};

export function StudioUploadPanel({
  frameVideoRef,
  studioPlyrRef,
  videoFile,
  setVideoFile,
  replacePreviewFromFile,
  previewUrl,
  title,
  setTitle,
  description,
  setDescription,
  tagsInput,
  setTagsInput,
  categoryId,
  setCategoryId,
  setIsCategoryManuallySelected,
  categories,
  visibility,
  setVisibility,
  photosensitiveWarning,
  setPhotosensitiveWarning,
  uploadFieldErrors,
  setUploadFieldErrors,
  thumbCandidates,
  isCapturingThumbs,
  selectedThumbCandidateId,
  setSelectedThumbCandidateId,
  setThumbnailFile,
  thumbCandidatesError,
  replaceThumbnailPreviewFromFile,
  error,
  success,
  source,
  playerKey,
  handlePublish,
  isPublishing,
  onSelectThumbCandidate,
}: StudioUploadPanelProps) {
  return (
    <section className="mx-auto w-full max-w-[1600px] rounded-2xl border border-white/10 bg-[#10182a] p-3 sm:p-4 md:p-5">
      <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">Загрузка и подготовка видео</h1>
      {!videoFile ? (
        <div className="mt-4 rounded-xl border border-dashed border-cyan-300/35 bg-[#0c1323]/80 p-5">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30">
            Выбрать видеофайл
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setVideoFile(file);
                replacePreviewFromFile(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {previewUrl ? (
            <video ref={frameVideoRef} src={previewUrl} className="hidden" crossOrigin="anonymous" preload="metadata" />
          ) : null}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#0c1323]/80 p-3">
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Название</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDownCapture={stopPlayerHotkeys}
                  className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                  placeholder="Название ролика"
                />
                {uploadFieldErrors.title ? <span className="text-xs text-rose-300">{uploadFieldErrors.title}</span> : null}
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Описание</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDownCapture={stopPlayerHotkeys}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                  placeholder="Описание видео"
                />
                {uploadFieldErrors.description ? (
                  <span className="text-xs text-rose-300">{uploadFieldErrors.description}</span>
                ) : null}
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Теги (хэштеги)</span>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDownCapture={stopPlayerHotkeys}
                  className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/55"
                  placeholder="#игры обзор или через запятую"
                  autoComplete="off"
                />
                <span className="text-[11px] leading-snug text-slate-500">
                  До {MAX_VIDEO_TAGS} тегов, до {MAX_VIDEO_TAG_LEN} символов каждый. Символ # необязателен.
                </span>
                {uploadFieldErrors.tags ? <span className="text-xs text-rose-300">{uploadFieldErrors.tags}</span> : null}
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Категория</span>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setIsCategoryManuallySelected(true);
                  }}
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
                {uploadFieldErrors.categoryId ? (
                  <span className="text-xs text-rose-300">{uploadFieldErrors.categoryId}</span>
                ) : null}
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Доступ к видео</span>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
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
                  checked={photosensitiveWarning}
                  onChange={(e) => setPhotosensitiveWarning(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0b1120] text-cyan-500 focus:ring-cyan-400/40"
                />
                <span className="text-sm leading-snug text-amber-100/95">
                  Предупреждение о вспышках / фоточувствительности (эпилепсия): перед просмотром покажем заметку зрителям.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Заменить видео</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setVideoFile(file);
                    replacePreviewFromFile(file);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-cyan-100"
                />
                {uploadFieldErrors.videoFile ? (
                  <span className="text-xs text-rose-300">{uploadFieldErrors.videoFile}</span>
                ) : null}
              </label>
              {previewUrl ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-3 rounded-lg border border-white/10 bg-[#0b1120]/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">Кадры для обложки</span>
                      <span className="text-xs text-cyan-200">
                        {isCapturingThumbs ? "..." : thumbCandidates.length ? `${thumbCandidates.length} шт` : "—"}
                      </span>
                    </div>

                    {isCapturingThumbs ? (
                      <p className="text-xs text-slate-400">Автовыбор кадров...</p>
                    ) : thumbCandidates.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {thumbCandidates.map((c) => {
                          const selected = selectedThumbCandidateId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => onSelectThumbCandidate(c)}
                              className={clsx(
                                "relative overflow-hidden rounded-lg border transition",
                                selected
                                  ? "border-cyan-300/35 bg-cyan-500/10"
                                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                              )}
                            >
                              <img src={c.previewUrl} alt="Кадр для обложки" className="aspect-video w-full object-cover" />
                              <div className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-cyan-100">
                                {c.timeSec.toFixed(1)}с
                              </div>
                              {selected ? (
                                <div className="absolute right-2 top-2 rounded bg-cyan-500/30 px-2 py-1 text-[10px] font-medium text-cyan-100">
                                  Выбрано
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {thumbCandidatesError ? <p className="text-xs text-rose-300">{thumbCandidatesError}</p> : null}
                  </div>

                  <div className="space-y-2 rounded-lg border border-white/10 bg-[#0b1120]/40 p-3">
                    <span className="text-xs text-slate-400">Загрузить свою обложку</span>
                    <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30">
                      Выбрать файл
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setThumbnailFile(file);
                          replaceThumbnailPreviewFromFile(file);
                          setUploadFieldErrors((prev) => ({ ...prev, thumbnailFile: undefined }));
                        }}
                        className="hidden"
                      />
                    </label>
                    {uploadFieldErrors.thumbnailFile ? (
                      <span className="text-xs text-rose-300">{uploadFieldErrors.thumbnailFile}</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Превью (thumbnail)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setThumbnailFile(file);
                      replaceThumbnailPreviewFromFile(file);
                      setUploadFieldErrors((prev) => ({ ...prev, thumbnailFile: undefined }));
                    }}
                    className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-cyan-100"
                  />
                  {uploadFieldErrors.thumbnailFile ? (
                    <span className="text-xs text-rose-300">{uploadFieldErrors.thumbnailFile}</span>
                  ) : null}
                </label>
              )}
              {error ? (
                <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{error}</p>
              ) : null}
              {success ? (
                <p className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">{success}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0c1323]/80 p-3">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
              {source ? (
                <PlyrVideo
                  ref={studioPlyrRef}
                  key={playerKey}
                  source={source}
                  options={{
                    i18n: plyrRuI18n,
                    keyboard: {
                      focused: false,
                      global: false,
                    },
                    controls: [
                      "play-large",
                      "play",
                      "progress",
                      "current-time",
                      "mute",
                      "volume",
                      "settings",
                      "fullscreen",
                    ],
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-300/20 bg-[#0b1120]/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full rounded-lg border border-cyan-300/35 bg-cyan-500/20 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {isPublishing ? "Публикуем..." : "Опубликовать видео"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
