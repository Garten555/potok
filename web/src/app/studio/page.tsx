"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fuzzyFilterEntities } from "@/lib/fuzzy-text-search";
import { StudioSidebar } from "@/components/studio/studio-sidebar";
import type { ThumbCandidate } from "@/components/studio/studio-upload-panel";
import type { EditVideoFieldErrors, StudioContentItem } from "@/components/studio/studio-content-view";
import type { PlaylistVideoDetail, StudioPlaylistRow, StudioVideoPickRow } from "@/components/studio/studio-playlists-view";

const studioPanelFallback = (
  <div className="animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-500">
    Загрузка…
  </div>
);

const StudioChannelAppearancePanel = dynamic(
  () => import("@/components/studio/studio-channel-appearance-panel").then((m) => m.StudioChannelAppearancePanel),
  { ssr: false, loading: () => studioPanelFallback },
);
const StudioIncomingReports = dynamic(
  () => import("@/components/studio/studio-incoming-reports").then((m) => m.StudioIncomingReports),
  { ssr: false, loading: () => studioPanelFallback },
);
const StudioStatsView = dynamic(
  () => import("@/components/studio/stats-view").then((m) => m.StudioStatsView),
  { ssr: false, loading: () => studioPanelFallback },
);
const StudioContentView = dynamic(
  () => import("@/components/studio/studio-content-view").then((m) => m.StudioContentView),
  { ssr: false, loading: () => studioPanelFallback },
);
const StudioPlaylistsView = dynamic(
  () => import("@/components/studio/studio-playlists-view").then((m) => m.StudioPlaylistsView),
  { ssr: false, loading: () => studioPanelFallback },
);
const StudioUploadPanelLazy = dynamic(
  () => import("@/components/studio/studio-upload-panel").then((m) => m.StudioUploadPanel),
  { ssr: false, loading: () => studioPanelFallback },
);
import type { PlyrVideoHandle } from "@/components/video/plyr-video-types";

type CategoryItem = {
  id: string;
  name: string;
};

type Visibility = "public" | "unlisted" | "private";

type ContentItem = StudioContentItem;

type PlaylistItem = StudioPlaylistRow;

type UploadFieldErrors = {
  title?: string;
  description?: string;
  tags?: string;
  categoryId?: string;
  videoFile?: string;
  thumbnailFile?: string;
};

const MAX_VIDEO_TAGS = 20;
const MAX_VIDEO_TAG_LEN = 48;

/** Парсит строку вида «#игры, обзор» или «игры обзор» в нормализованный список тегов для `videos.tags`. */
function parseVideoTagsInput(raw: string): { tags: string[]; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { tags: [] };
  if (trimmed.length > 600) return { tags: [], error: "Строка тегов слишком длинная (макс. 600 символов)." };
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const token of trimmed.split(/[\s,]+/)) {
    let t = token.trim();
    if (!t) continue;
    if (t.startsWith("#")) t = t.slice(1).trim();
    if (!t) continue;
    t = t.toLowerCase();
    if (t.length > MAX_VIDEO_TAG_LEN) {
      return { tags: [], error: `Тег не длиннее ${MAX_VIDEO_TAG_LEN} символов.` };
    }
    if (seen.has(t)) continue;
    seen.add(t);
    tags.push(t);
    if (tags.length > MAX_VIDEO_TAGS) {
      return { tags: [], error: `Не больше ${MAX_VIDEO_TAGS} тегов.` };
    }
  }
  return { tags };
}

/** PostgREST при отсутствии колонки в кэше схемы (миграция не применена). */
function isMissingPhotosensitiveColumnError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err?.message) return false;
  const m = err.message.toLowerCase();
  return m.includes("photosensitive_warning") || (m.includes("column") && m.includes("schema"));
}

type PlaylistFieldErrors = {
  title?: string;
  description?: string;
  videos?: string;
};

const RU_PROFANITY_PATTERNS = [
  /х+у+[йияеёю]*/u,
  /п[ие]зд/u,
  /еб[аеиёоуыюя]*/u,
  /бля[дть]*/u,
  /сук[аи]/u,
  /муд[ао]к/u,
  /гандон/u,
  /долбоеб/u,
  /чмо/u,
];

const EN_PROFANITY_PATTERNS = [/fuck/u, /shit/u, /bitch/u, /asshole/u, /dick/u, /cunt/u, /motherfucker/u, /fag/u, /slut/u, /whore/u];

function normalizeForProfanity(value: string): string {
  return value
    .toLowerCase()
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-zа-яё]/gu, "");
}

function containsProfanity(value: string): boolean {
  const normalized = normalizeForProfanity(value);
  return (
    RU_PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    EN_PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

function suggestCategoryId(
  title: string,
  description: string,
  categories: CategoryItem[],
): string | null {
  const titleText = title.toLowerCase();
  const descriptionText = description.toLowerCase();
  const scoreText = (text: string, keyword: string) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    return (text.match(regex) ?? []).length;
  };
  const rules: Array<{ keys: string[]; categoryHints: string[]; slug: string }> = [
    {
      slug: "games",
      keys: [
        "игр", "игра", "игры", "гейм", "прохожд", "летспле", "стрим", "киберспорт",
        "game", "gaming", "walkthrough", "let's play", "dota", "cs2", "valorant", "minecraft",
      ],
      categoryHints: ["видеоигр", "игр", "game"],
    },
    {
      slug: "music",
      keys: ["музык", "песня", "трек", "бит", "клип", "кавер", "music", "song", "track", "clip", "cover"],
      categoryHints: ["музык", "music"],
    },
    {
      slug: "movies",
      keys: ["фильм", "сериал", "кино", "трейлер", "обзор фильма", "movie", "series", "cinema", "trailer"],
      categoryHints: ["фильм", "сериал", "movie"],
    },
    {
      slug: "sport",
      keys: ["спорт", "футбол", "баскет", "ufc", "mma", "трениров", "sport", "football", "basketball", "workout"],
      categoryHints: ["спорт", "sport"],
    },
    {
      slug: "education",
      keys: ["урок", "обуч", "лекц", "гайд", "как", "education", "tutorial", "guide", "lesson", "course"],
      categoryHints: ["образован", "education", "обуч"],
    },
    {
      slug: "comedy",
      keys: ["юмор", "прикол", "мем", "смешно", "комедия", "meme", "funny", "comedy", "joke"],
      categoryHints: ["комед", "юмор", "comedy"],
    },
    {
      slug: "tech",
      keys: ["техн", "смартфон", "ноутбук", "желез", "ai", "ии", "программир", "код", "tech", "gadget", "programming", "code"],
      categoryHints: ["техн", "tech", "гаджет"],
    },
  ];

  let bestCategoryId: string | null = null;
  let bestScore = 0;
  for (const rule of rules) {
    const score = rule.keys.reduce((sum, key) => {
      const titleHits = scoreText(titleText, key);
      const descriptionHits = scoreText(descriptionText, key);
      return sum + titleHits * 3 + descriptionHits;
    }, 0);
    if (score === 0) continue;
    const match = categories.find((cat) => {
      const name = cat.name.toLowerCase();
      return rule.categoryHints.some((hint) => name.includes(hint)) || name.includes(rule.slug);
    });
    if (match && score > bestScore) {
      bestScore = score;
      bestCategoryId = match.id;
    }
  }
  return bestCategoryId;
}

async function uploadStudioFile(file: File, userId: string, kind: "video" | "thumbnail") {
  const supabase = createSupabaseBrowserClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : kind === "video" ? "mp4" : "jpg";
  const safeExt = (ext ?? "bin").toLowerCase();
  const path = `videos/${userId}/${kind}-${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) throw new Error(`Ошибка загрузки ${kind}.`);
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

async function playlistVideoCountsByPlaylistId(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  playlistIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (playlistIds.length === 0) return map;
  const { data } = await supabase.from("playlist_videos").select("playlist_id").in("playlist_id", playlistIds);
  for (const row of data ?? []) {
    const id = (row as { playlist_id: string }).playlist_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

function StudioInner() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isCategoryManuallySelected, setIsCategoryManuallySelected] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [playerKey, setPlayerKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadFieldErrors, setUploadFieldErrors] = useState<UploadFieldErrors>({});
  const [playlistFieldErrors, setPlaylistFieldErrors] = useState<PlaylistFieldErrors>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [photosensitiveWarning, setPhotosensitiveWarning] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [ownVideos, setOwnVideos] = useState<StudioVideoPickRow[]>([]);
  const [allVideos, setAllVideos] = useState<StudioVideoPickRow[]>([]);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistKind, setPlaylistKind] = useState<"channel" | "user">("channel");
  const [playlistVisibility, setPlaylistVisibility] = useState<Visibility>("public");
  const [selectedPlaylistVideoIds, setSelectedPlaylistVideoIds] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [targetPlaylistIdForAdd, setTargetPlaylistIdForAdd] = useState("");
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [playlistVideosDetail, setPlaylistVideosDetail] = useState<Record<string, PlaylistVideoDetail[]>>({});
  const [loadingPlaylistDetailId, setLoadingPlaylistDetailId] = useState<string | null>(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  const [isAddingVideosToPlaylist, setIsAddingVideosToPlaylist] = useState(false);
  const [playlistActionMessage, setPlaylistActionMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [activeNav, setActiveNav] = useState<
    "upload" | "content" | "playlists" | "stats" | "channel_home" | "incoming_reports"
  >("upload");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const previewUrlRef = useRef("");
  const thumbnailPreviewUrlRef = useRef("");
  const frameVideoRef = useRef<HTMLVideoElement | null>(null);
  const thumbCandidatesRef = useRef<ThumbCandidate[]>([]);
  const [thumbCandidates, setThumbCandidates] = useState<ThumbCandidate[]>([]);
  const [selectedThumbCandidateId, setSelectedThumbCandidateId] = useState<string | null>(null);
  const [isCapturingThumbs, setIsCapturingThumbs] = useState(false);
  const [thumbCandidatesError, setThumbCandidatesError] = useState("");
  /** Обложка для Plyr (не первый кадр видео), синхронизируется с выбранным превью */
  const [studioPlayerPosterUrl, setStudioPlayerPosterUrl] = useState<string | undefined>(undefined);
  const studioPosterUrlRef = useRef<string | undefined>(undefined);
  studioPosterUrlRef.current = studioPlayerPosterUrl;
  const applyStudioPosterRef = useRef<(() => void) | null>(null);
  const [channelStats, setChannelStats] = useState<{
    subscribersCount: number;
    totalViews: number;
    videosCount: number;
    viewsSeries: Array<{ label: string; value: number }>;
    subsSeries: Array<{ label: string; value: number }>;
  } | null>(null);

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editVisibility, setEditVisibility] = useState<Visibility>("public");
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<EditVideoFieldErrors>({});
  const [editPhotosensitiveWarning, setEditPhotosensitiveWarning] = useState(false);
  const [studioContentQuery, setStudioContentQuery] = useState("");
  const [studioContentVisibility, setStudioContentVisibility] = useState<"all" | Visibility>("all");
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  const sp = useSearchParams();
  const router = useRouter();

  const goToStudioTab = useCallback(
    (
      nav: "upload" | "content" | "playlists" | "stats" | "channel_home" | "incoming_reports",
    ) => {
      const tab =
        nav === "channel_home" ? "channel-home" : nav === "incoming_reports" ? "incoming-reports" : nav;
      setActiveNav(nav);
      router.replace(`/studio?tab=${tab}`, { scroll: false });
    },
    [router],
  );

  const debugLog = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      // Dedicated studio debug logs to catch unexpected redirects/focus jumps.
      console.log("[studio-debug]", ...args);
    }
  };

  useEffect(() => {
    // sidebar "Ваши видео" -> /studio?tab=content
    const tab = sp?.get("tab");
    if (tab === "upload") setActiveNav("upload");
    else if (tab === "playlists") setActiveNav("playlists");
    else if (tab === "content") setActiveNav("content");
    else if (tab === "stats") setActiveNav("stats");
    else if (tab === "channel-home") setActiveNav("channel_home");
    else if (tab === "incoming-reports") setActiveNav("incoming_reports");
  }, [sp]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const blockedKeys = new Set([" ", "Spacebar", "k", "K", "j", "J", "l", "L", "f", "F", "m", "M"]);
    const onKeydownCapture = (event: globalThis.KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;

      const tag = active.tagName;
      const isTypingTarget =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        active.isContentEditable;

      if (!isTypingTarget) return;
      if (!blockedKeys.has(event.key)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      debugLog("blocked player key while typing", event.key, {
        tag: active.tagName,
        id: active.id || null,
        className: active.className || null,
      });
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const onBeforeUnload = () => debugLog("beforeunload", window.location.href);
    const onVisibilityChange = () => debugLog("visibilitychange", document.visibilityState);
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      debugLog("focusin", target.tagName, target.id || null, target.className || null);
    };
    const onPopState = () => debugLog("popstate", window.location.href);

    document.addEventListener("keydown", onKeydownCapture, true);
    document.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("keydown", onKeydownCapture, true);
      document.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const replacePreviewFromFile = (file: File | null) => {
    const prev = previewUrlRef.current;
    if (prev.startsWith("blob:")) {
      URL.revokeObjectURL(prev);
    }
    if (!file) {
      previewUrlRef.current = "";
      setPreviewUrl("");
      studioPosterUrlRef.current = undefined;
      setStudioPlayerPosterUrl(undefined);
      setPlayerKey((prevKey) => prevKey + 1);
      return;
    }
    const next = URL.createObjectURL(file);
    previewUrlRef.current = next;
    setPreviewUrl(next);
    setPlayerKey((prevKey) => prevKey + 1);

    // New video means thumbnail candidates become invalid.
    thumbCandidatesRef.current.forEach((c) => {
      if (c.previewUrl.startsWith("blob:")) URL.revokeObjectURL(c.previewUrl);
    });
    thumbCandidatesRef.current = [];
    setThumbCandidates([]);
    setSelectedThumbCandidateId(null);
    setThumbCandidatesError("");
    setIsCapturingThumbs(false);

    const prevThumb = thumbnailPreviewUrlRef.current;
    if (prevThumb?.startsWith("blob:")) URL.revokeObjectURL(prevThumb);
    thumbnailPreviewUrlRef.current = "";
    setThumbnailFile(null);
  };

  const replaceThumbnailPreviewFromFile = (file: File | null) => {
    const prev = thumbnailPreviewUrlRef.current;
    const prevIsCandidatePreview = thumbCandidatesRef.current.some((c) => c.previewUrl === prev);
    if (prev.startsWith("blob:") && !prevIsCandidatePreview) {
      URL.revokeObjectURL(prev);
    }
    if (!file) {
      thumbnailPreviewUrlRef.current = "";
      studioPosterUrlRef.current = undefined;
      setStudioPlayerPosterUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(file);
    thumbnailPreviewUrlRef.current = next;
    studioPosterUrlRef.current = next;
    setStudioPlayerPosterUrl(next);
    setSelectedThumbCandidateId(null); // User uploaded their own cover.
  };

  const revokeCandidatesPreviews = (candidates: ThumbCandidate[]) => {
    candidates.forEach((c) => {
      if (c.previewUrl.startsWith("blob:")) URL.revokeObjectURL(c.previewUrl);
    });
  };

  const captureFrameAtTime = async (targetTimeSec: number) => {
    const videoEl = frameVideoRef.current;
    if (!videoEl || !previewUrl) throw new Error("Видео ещё не доступно для захвата кадра.");

    if (!Number.isFinite(videoEl.duration) || videoEl.duration <= 0) {
      await new Promise<void>((resolve) => {
        const onLoaded = () => resolve();
        videoEl.addEventListener("loadedmetadata", onLoaded, { once: true });
      });
    }

    const duration = videoEl.duration;
    const safeEnd = Math.max(0, duration - 0.05);
    const targetTime = Math.max(0, Math.min(targetTimeSec, safeEnd));

    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => resolve();
      const onError = () => reject(new Error("Не удалось получить кадр из видео."));

      videoEl.addEventListener("seeked", onSeeked, { once: true });
      videoEl.addEventListener("error", onError, { once: true });
      videoEl.currentTime = targetTime;
    });

    if (!videoEl.videoWidth || !videoEl.videoHeight) {
      throw new Error("Видео не загрузилось полностью для кадра.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas недоступен.");
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
    if (!blob) throw new Error("Не удалось сформировать файл превью.");

    const file = new File([blob], `thumbnail-${Date.now()}.jpg`, { type: "image/jpeg" });
    const preview = URL.createObjectURL(file);
    return { file, preview, timeSec: targetTime };
  };

  const generateAutoThumbCandidates = async (isStale: () => boolean) => {
    const videoEl = frameVideoRef.current;
    if (!videoEl || !previewUrl) return;

    setThumbCandidatesError("");
    setIsCapturingThumbs(true);

    // Clear previous candidates (and revoke their preview URLs).
    revokeCandidatesPreviews(thumbCandidatesRef.current);
    thumbCandidatesRef.current = [];
    setThumbCandidates([]);
    setSelectedThumbCandidateId(null);

    // Clear selected thumbnail so the new candidates become the default.
    const prevThumb = thumbnailPreviewUrlRef.current;
    if (prevThumb?.startsWith("blob:")) URL.revokeObjectURL(prevThumb);
    thumbnailPreviewUrlRef.current = "";
    setThumbnailFile(null);
    studioPosterUrlRef.current = undefined;
    setStudioPlayerPosterUrl(undefined);

    try {
      // Wait duration if needed.
      if (!Number.isFinite(videoEl.duration) || videoEl.duration <= 0) {
        await new Promise<void>((resolve) => {
          const onLoaded = () => resolve();
          videoEl.addEventListener("loadedmetadata", onLoaded, { once: true });
        });
      }

      if (isStale()) return;

      const duration = videoEl.duration;
      const safeEnd = Math.max(0, duration - 0.05);
      /** Первая секунда ролика + ещё 3 кадра равномерно до конца (всего 4). Первый — по умолчанию. */
      const tStart = Math.min(1, safeEnd);
      const inner = Math.max(0, safeEnd - tStart);
      const times: number[] =
        inner < 0.02
          ? [tStart]
          : [tStart, tStart + inner * (1 / 3), tStart + inner * (2 / 3), tStart + inner];

      const candidates: ThumbCandidate[] = [];
      for (let i = 0; i < times.length; i++) {
        if (isStale()) return;
        const { file, preview, timeSec } = await captureFrameAtTime(times[i]);
        candidates.push({
          id: `auto-${Date.now()}-${i}`,
          timeSec,
          file,
          previewUrl: preview,
        });
      }

      if (isStale()) return;

      setThumbCandidates(candidates);
      thumbCandidatesRef.current = candidates;

      const first = candidates[0];
      if (first) {
        setSelectedThumbCandidateId(first.id);
        setThumbnailFile(first.file);
        thumbnailPreviewUrlRef.current = first.previewUrl;
        studioPosterUrlRef.current = first.previewUrl;
        setStudioPlayerPosterUrl(first.previewUrl);
        queueMicrotask(() => {
          applyStudioPosterRef.current?.();
          requestAnimationFrame(() => applyStudioPosterRef.current?.());
        });
      }
    } catch (e) {
      if (!isStale()) {
        setThumbCandidatesError(e instanceof Error ? e.message : "Не удалось выбрать кадры.");
      }
    } finally {
      setIsCapturingThumbs(false);
    }
  };

  useEffect(() => {
    if (!previewUrl) return;
    let cancelled = false;
    const isStale = () => cancelled;

    const run = async () => {
      if (!frameVideoRef.current) {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (cancelled || !frameVideoRef.current) return;
      }
      await generateAutoThumbCandidates(isStale);
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      const current = previewUrlRef.current;
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      const currentThumb = thumbnailPreviewUrlRef.current;
      if (currentThumb.startsWith("blob:")) {
        URL.revokeObjectURL(currentThumb);
      }
      thumbCandidatesRef.current.forEach((c) => {
        if (c.previewUrl.startsWith("blob:")) URL.revokeObjectURL(c.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    thumbCandidatesRef.current = thumbCandidates;
  }, [thumbCandidates]);

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/auth";
        return;
      }
      setUserId(userData.user.id);

      // Канальная статистика (подписчики, просмотры, кол-во видео).
      try {
        const monthsToShow = 6;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1), 1);
        const cutoffISO = start.toISOString();

        const monthLabel = (d: Date) =>
          d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");

        const monthIndex = (d: Date) =>
          (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());

        const viewsSeriesBase = Array.from({ length: monthsToShow }, (_, i) => ({
          label: monthLabel(new Date(start.getFullYear(), start.getMonth() + i, 1)),
          value: 0,
        }));
        const subsSeriesBase = Array.from({ length: monthsToShow }, (_, i) => ({
          label: monthLabel(new Date(start.getFullYear(), start.getMonth() + i, 1)),
          value: 0,
        }));

        const { data: profileStats } = await supabase
          .from("users")
          .select("subscribers_count")
          .eq("id", userData.user.id)
          .maybeSingle();

        const { count: videosCount } = await supabase
          .from("videos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userData.user.id);

        // Суммируем просмотры на клиенте (ограничиваем выборку, чтобы не грузить лишнее).
        const { data: viewsRows } = await supabase
          .from("videos")
          .select("views")
          .eq("user_id", userData.user.id)
          .limit(2000);

        const totalViews = (viewsRows ?? []).reduce((sum, row) => sum + (row.views ?? 0), 0);

        // График просмотров: суммируем views у видео, созданных в каждом месяце.
        const { data: viewsSeriesRows } = await supabase
          .from("videos")
          .select("created_at, views")
          .eq("user_id", userData.user.id)
          .gte("created_at", cutoffISO)
          .limit(2000);

        for (const row of viewsSeriesRows ?? []) {
          const createdAt = row.created_at ? new Date(row.created_at) : null;
          if (!createdAt) continue;
          const idx = monthIndex(createdAt);
          if (idx < 0 || idx >= monthsToShow) continue;
          viewsSeriesBase[idx] = { ...viewsSeriesBase[idx], value: viewsSeriesBase[idx].value + (row.views ?? 0) };
        }

        // График подписок: считаем количество новых подписок по месяцу.
        const { data: subsRows } = await supabase
          .from("subscriptions")
          .select("created_at")
          .eq("channel_id", userData.user.id)
          .gte("created_at", cutoffISO)
          .limit(2000);

        for (const row of subsRows ?? []) {
          const createdAt = row.created_at ? new Date(row.created_at) : null;
          if (!createdAt) continue;
          const idx = monthIndex(createdAt);
          if (idx < 0 || idx >= monthsToShow) continue;
          subsSeriesBase[idx] = { ...subsSeriesBase[idx], value: subsSeriesBase[idx].value + 1 };
        }

        setChannelStats({
          subscribersCount: profileStats?.subscribers_count ?? 0,
          totalViews,
          videosCount: typeof videosCount === "number" ? videosCount : (viewsRows ?? []).length,
          viewsSeries: viewsSeriesBase,
          subsSeries: subsSeriesBase,
        });
      } catch {
        setChannelStats({
          subscribersCount: 0,
          totalViews: 0,
          videosCount: 0,
          viewsSeries: [],
          subsSeries: [],
        });
      }

      const { data: catData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      setCategories(catData ?? []);

      const { data: videoData } = await supabase
        .from("videos")
        .select("id, title, description, tags, created_at, visibility, views, thumbnail_url, category_id, photosensitive_warning")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (videoData) {
        setContentItems(videoData as ContentItem[]);
      } else {
        const { data: fallbackVideoData } = await supabase
          .from("videos")
          .select("id, title, description, tags, created_at, visibility, views, thumbnail_url, category_id")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setContentItems((fallbackVideoData ?? []) as ContentItem[]);
      }

      const { data: ownVideoData } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(150);
      setOwnVideos((ownVideoData ?? []) as StudioVideoPickRow[]);

      const { data: allVideoData } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, created_at")
        .in("visibility", ["public", "unlisted"])
        .order("created_at", { ascending: false })
        .limit(200);
      setAllVideos((allVideoData ?? []) as StudioVideoPickRow[]);

      const { data: playlistData } = await supabase
        .from("playlists")
        .select("id, title, description, kind, visibility, created_at")
        .eq("user_id", userData.user.id)
        .eq("is_system", false)
        .order("created_at", { ascending: false })
        .limit(50);
      const plist = playlistData ?? [];
      const pids = plist.map((p) => p.id);
      const countMap = await playlistVideoCountsByPlaylistId(supabase, pids);
      setPlaylists(
        plist.map((p) => ({
          ...p,
          videos_count: countMap.get(p.id) ?? 0,
        })),
      );
    };
    void init();
  }, []);

  useEffect(() => {
    if (isCategoryManuallySelected || categories.length === 0) return;
    const suggested = suggestCategoryId(title, description, categories);
    if (suggested) setCategoryId(suggested);
  }, [title, description, categories, isCategoryManuallySelected]);

  const filteredStudioContent = useMemo(() => {
    const byVisibility = contentItems.filter((item) => {
      const vis = item.visibility ?? "public";
      if (studioContentVisibility !== "all" && vis !== studioContentVisibility) return false;
      return true;
    });
    return fuzzyFilterEntities(
      byVisibility,
      (item) => item.id,
      (item) => {
        const tags = ((item.tags ?? []) as string[]).join(" ");
        return [item.title, item.description ?? "", tags];
      },
      studioContentQuery,
    );
  }, [contentItems, studioContentQuery, studioContentVisibility]);

  const source = useMemo(() => {
    if (!previewUrl) return null;
    return {
      type: "video" as const,
      sources: [
        {
          src: previewUrl,
          type: videoFile?.type || "video/mp4",
        },
      ],
    };
  }, [previewUrl, videoFile?.type]);

  /** Постер обложки на video отдельно от source — иначе смена poster пересоздаёт Plyr (react-aptor) и ловится removeChild. */
  const studioPlyrRef = useRef<PlyrVideoHandle | null>(null);

  const applyStudioPoster = useCallback(() => {
    const url = studioPosterUrlRef.current;
    const container = studioPlyrRef.current?.plyr?.elements?.container;
    const media = container?.querySelector("video");
    if (!media) return;
    if (url) {
      media.poster = url;
    } else {
      media.removeAttribute("poster");
    }
  }, []);

  useLayoutEffect(() => {
    applyStudioPosterRef.current = applyStudioPoster;
  }, [applyStudioPoster]);

  useLayoutEffect(() => {
    applyStudioPoster();
    const delays = [0, 16, 50, 120, 250, 500, 1000, 1800];
    const ids = delays.map((ms) => window.setTimeout(applyStudioPoster, ms));
    return () => ids.forEach(clearTimeout);
  }, [studioPlayerPosterUrl, playerKey, previewUrl, isCapturingThumbs, thumbCandidates.length, applyStudioPoster]);

  /** Plyr подгружается динамически: при первом apply элемент видео ещё не в DOM — повторяем, пока плеер не смонтирован. */
  useEffect(() => {
    if (!studioPlayerPosterUrl || isCapturingThumbs || thumbCandidates.length === 0) return;
    applyStudioPoster();
    const interval = window.setInterval(applyStudioPoster, 200);
    const stop = window.setTimeout(() => window.clearInterval(interval), 4000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [studioPlayerPosterUrl, isCapturingThumbs, thumbCandidates.length, applyStudioPoster]);

  const handlePublish = async () => {
    const nextErrors: UploadFieldErrors = {};
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const selectedVideoFile = videoFile;
    const selectedThumbnailFile = thumbnailFile;
    if (!normalizedTitle) nextErrors.title = "Введите название видео.";
    else if (normalizedTitle.length < 3) nextErrors.title = "Название должно быть не короче 3 символов.";
    else if (normalizedTitle.length > 120) nextErrors.title = "Название должно быть не длиннее 120 символов.";
    else if (containsProfanity(normalizedTitle)) nextErrors.title = "Название содержит недопустимую лексику.";
    if (normalizedDescription.length > 5000) nextErrors.description = "Описание должно быть не длиннее 5000 символов.";
    else if (normalizedDescription && containsProfanity(normalizedDescription)) {
      nextErrors.description = "Описание содержит недопустимую лексику.";
    }
    const tagParse = parseVideoTagsInput(tagsInput);
    if (tagParse.error) nextErrors.tags = tagParse.error;
    else if (tagParse.tags.some((t) => containsProfanity(t))) {
      nextErrors.tags = "Один из тегов содержит недопустимую лексику.";
    }
    if (!categoryId) nextErrors.categoryId = "Выберите категорию.";
    if (!selectedVideoFile) nextErrors.videoFile = "Загрузите видеофайл.";
    if (!selectedThumbnailFile) nextErrors.thumbnailFile = "Загрузите превью (thumbnail).";
    setUploadFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsPublishing(true);
      setError("");
      setSuccess("");
      const videoUrl = await uploadStudioFile(selectedVideoFile as File, userId, "video");
      const thumbnailUrl = await uploadStudioFile(selectedThumbnailFile as File, userId, "thumbnail");

      const supabase = createSupabaseBrowserClient();
      const baseInsert = {
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        tags: tagParse.tags,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        visibility,
        photosensitive_warning: photosensitiveWarning,
      };

      const insertRes = await supabase
        .from("videos")
        .insert(baseInsert)
        .select("id, title, description, tags, created_at, visibility, views, thumbnail_url, category_id, photosensitive_warning")
        .single();
      let insertError = insertRes.error;
      let insertedVideo: ContentItem | null = insertRes.data as ContentItem | null;

      if (insertError && isMissingPhotosensitiveColumnError(insertError)) {
        const { photosensitive_warning: _ps, ...withoutPs } = baseInsert;
        const retry = await supabase
          .from("videos")
          .insert(withoutPs)
          .select("id, title, description, tags, created_at, visibility, views, thumbnail_url, category_id")
          .single();
        insertError = retry.error;
        insertedVideo = retry.data
          ? ({ ...(retry.data as Record<string, unknown>), photosensitive_warning: photosensitiveWarning } as ContentItem)
          : null;
      }

      if (insertError || !insertedVideo) {
        setError("Не удалось опубликовать видео.");
        return;
      }

      setSuccess("Видео опубликовано.");
      setTitle("");
      setDescription("");
      setTagsInput("");
      setCategoryId("");
      setVisibility("public");
      setPhotosensitiveWarning(false);
      setVideoFile(null);
      setThumbnailFile(null);
      replacePreviewFromFile(null);
      replaceThumbnailPreviewFromFile(null);
      setUploadFieldErrors({});
      if (insertedVideo) {
        setContentItems((prev) => [insertedVideo, ...prev].slice(0, 20));
        setOwnVideos((prev) =>
          [
            {
              id: insertedVideo.id,
              title: insertedVideo.title,
              thumbnail_url: insertedVideo.thumbnail_url ?? null,
              created_at: insertedVideo.created_at,
            },
            ...prev,
          ].slice(0, 150),
        );
      }
      goToStudioTab("content");
    } catch {
      setError("Ошибка загрузки файлов в Storage.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreatePlaylist = async () => {
    const nextErrors: PlaylistFieldErrors = {};
    const normalizedTitle = playlistTitle.trim();
    const normalizedDescription = playlistDescription.trim();
    if (!normalizedTitle) nextErrors.title = "Введите название плейлиста.";
    else if (normalizedTitle.length < 2) nextErrors.title = "Название плейлиста слишком короткое.";
    else if (normalizedTitle.length > 80) nextErrors.title = "Название плейлиста слишком длинное.";
    else if (containsProfanity(normalizedTitle)) nextErrors.title = "Название плейлиста содержит недопустимую лексику.";
    if (normalizedDescription.length > 1000) nextErrors.description = "Описание плейлиста должно быть не длиннее 1000 символов.";
    else if (normalizedDescription && containsProfanity(normalizedDescription)) {
      nextErrors.description = "Описание плейлиста содержит недопустимую лексику.";
    }
    setPlaylistFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsCreatingPlaylist(true);
      setError("");
      setSuccess("");
      const supabase = createSupabaseBrowserClient();
      const { data: playlistInserted, error: playlistError } = await supabase
        .from("playlists")
        .insert({
          user_id: userId,
          title: playlistTitle.trim(),
          description: playlistDescription.trim() || null,
          kind: playlistKind,
          visibility: playlistVisibility,
        })
        .select("id, title, description, kind, visibility, created_at")
        .single();

      if (playlistError || !playlistInserted) {
        setError("Не удалось создать плейлист.");
        return;
      }

      const payload =
        selectedPlaylistVideoIds.length > 0
          ? selectedPlaylistVideoIds.map((videoId, index) => ({
              playlist_id: playlistInserted.id,
              video_id: videoId,
              position: index + 1,
            }))
          : [];

      if (payload.length > 0) {
        const { error: linkError } = await supabase.from("playlist_videos").insert(payload);
        if (linkError) {
          setError("Плейлист создан, но не удалось добавить видео.");
          return;
        }
      }

      setPlaylists((prev) => [{ ...playlistInserted, videos_count: payload.length }, ...prev]);
      setPlaylistTitle("");
      setPlaylistDescription("");
      setPlaylistKind("channel");
      setPlaylistVisibility("public");
      setSelectedPlaylistVideoIds([]);
      setPlaylistFieldErrors({});
      setSuccess("Плейлист создан.");
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const loadPlaylistVideos = async (playlistId: string) => {
    setLoadingPlaylistDetailId(playlistId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: rows, error } = await supabase
        .from("playlist_videos")
        .select("video_id, position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });
      if (error) {
        setPlaylistVideosDetail((prev) => ({ ...prev, [playlistId]: [] }));
        return;
      }
      if (!rows?.length) {
        setPlaylistVideosDetail((prev) => ({ ...prev, [playlistId]: [] }));
        return;
      }
      const ids = rows.map((r) => r.video_id);
      const { data: vids } = await supabase.from("videos").select("id, title, thumbnail_url").in("id", ids);
      const map = new Map((vids ?? []).map((v) => [v.id, v]));
      const detail: PlaylistVideoDetail[] = rows.map((r) => {
        const v = map.get(r.video_id);
        return {
          video_id: r.video_id,
          position: r.position,
          title: v?.title ?? "—",
          thumbnail_url: v?.thumbnail_url ?? null,
        };
      });
      setPlaylistVideosDetail((prev) => ({ ...prev, [playlistId]: detail }));
    } finally {
      setLoadingPlaylistDetailId(null);
    }
  };

  const onToggleExpandPlaylist = async (id: string) => {
    if (expandedPlaylistId === id) {
      setExpandedPlaylistId(null);
      return;
    }
    setExpandedPlaylistId(id);
    await loadPlaylistVideos(id);
  };

  const handleAddVideosToPlaylist = async () => {
    if (!targetPlaylistIdForAdd || selectedPlaylistVideoIds.length === 0 || !userId) return;
    setIsAddingVideosToPlaylist(true);
    setPlaylistActionMessage(null);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const playlistId = targetPlaylistIdForAdd;
      const { data: existing } = await supabase
        .from("playlist_videos")
        .select("video_id, position")
        .eq("playlist_id", playlistId);
      const existingIds = new Set((existing ?? []).map((r) => r.video_id));
      const maxPos = (existing ?? []).reduce((m, r) => Math.max(m, r.position), 0);
      const toAdd = selectedPlaylistVideoIds.filter((vid) => !existingIds.has(vid));
      if (toAdd.length === 0) {
        setPlaylistActionMessage("Выбранные видео уже в этом плейлисте.");
        return;
      }
      const payload = toAdd.map((videoId, i) => ({
        playlist_id: playlistId,
        video_id: videoId,
        position: maxPos + i + 1,
      }));
      const { error } = await supabase.from("playlist_videos").insert(payload);
      if (error) {
        setError("Не удалось добавить видео в плейлист.");
        return;
      }
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId ? { ...p, videos_count: (p.videos_count ?? 0) + toAdd.length } : p,
        ),
      );
      if (expandedPlaylistId === playlistId) {
        await loadPlaylistVideos(playlistId);
      }
      setPlaylistActionMessage(`Добавлено в плейлист: ${toAdd.length} видео.`);
      setSelectedPlaylistVideoIds([]);
      window.setTimeout(() => setPlaylistActionMessage(null), 4000);
    } finally {
      setIsAddingVideosToPlaylist(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!userId) return;
    setDeletingPlaylistId(id);
    setPlaylistActionMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("playlists").delete().eq("id", id).eq("user_id", userId);
      if (error) {
        setError("Не удалось удалить плейлист.");
        return;
      }
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (targetPlaylistIdForAdd === id) setTargetPlaylistIdForAdd("");
      if (expandedPlaylistId === id) setExpandedPlaylistId(null);
      setPlaylistVideosDetail((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPlaylistActionMessage("Плейлист удалён.");
      window.setTimeout(() => setPlaylistActionMessage(null), 4000);
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleRemoveVideoFromPlaylist = async (playlistId: string, videoId: string) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("playlist_videos")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("video_id", videoId);
    if (error) {
      setError("Не удалось убрать видео из плейлиста.");
      return;
    }
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, videos_count: Math.max(0, (p.videos_count ?? 1) - 1) } : p,
      ),
    );
    await loadPlaylistVideos(playlistId);
  };

  const openEditVideo = (item: ContentItem) => {
    setEditingVideoId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    const tags = (item.tags ?? []) as string[];
    setEditTagsInput(tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" "));
    setEditCategoryId(item.category_id ?? "");
    setEditVisibility(item.visibility ?? "public");
    setEditPhotosensitiveWarning(Boolean((item as { photosensitive_warning?: boolean }).photosensitive_warning));
    setEditThumbnailFile(null);
    setEditError("");
    setEditFieldErrors({});
  };

  const cancelEditVideo = () => {
    setEditingVideoId(null);
    setEditTagsInput("");
    setEditThumbnailFile(null);
    setEditError("");
    setEditFieldErrors({});
  };

  const handleSaveVideoEdit = async () => {
    if (!editingVideoId || !userId) return;

    const nextErrors: EditVideoFieldErrors = {};
    const normalizedTitle = editTitle.trim();
    const normalizedDescription = editDescription.trim();
    if (!normalizedTitle) nextErrors.title = "Введите название видео.";
    else if (normalizedTitle.length < 3) nextErrors.title = "Название должно быть не короче 3 символов.";
    else if (normalizedTitle.length > 120) nextErrors.title = "Название должно быть не длиннее 120 символов.";
    else if (containsProfanity(normalizedTitle)) nextErrors.title = "Название содержит недопустимую лексику.";
    if (normalizedDescription.length > 5000) nextErrors.description = "Описание должно быть не длиннее 5000 символов.";
    else if (normalizedDescription && containsProfanity(normalizedDescription)) {
      nextErrors.description = "Описание содержит недопустимую лексику.";
    }
    if (!editCategoryId) nextErrors.categoryId = "Выберите категорию.";
    const editTagParse = parseVideoTagsInput(editTagsInput);
    if (editTagParse.error) nextErrors.tags = editTagParse.error;
    else if (editTagParse.tags.some((t) => containsProfanity(t))) {
      nextErrors.tags = "Один из тегов содержит недопустимую лексику.";
    }
    setEditFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setEditSaving(true);
    setEditError("");
    try {
      let thumbnailUrl: string | undefined;
      if (editThumbnailFile) {
        thumbnailUrl = await uploadStudioFile(editThumbnailFile, userId, "thumbnail");
      }

      const supabase = createSupabaseBrowserClient();
      const updatePayload: {
        title: string;
        description: string | null;
        category_id: string;
        visibility: Visibility;
        tags: string[];
        thumbnail_url?: string;
        photosensitive_warning: boolean;
      } = {
        title: normalizedTitle,
        description: normalizedDescription || null,
        category_id: editCategoryId,
        visibility: editVisibility,
        tags: editTagParse.tags,
        photosensitive_warning: editPhotosensitiveWarning,
      };
      if (thumbnailUrl) updatePayload.thumbnail_url = thumbnailUrl;

      const updRes = await supabase
        .from("videos")
        .update(updatePayload)
        .eq("id", editingVideoId)
        .eq("user_id", userId)
        .select("id, title, description, tags, created_at, visibility, views, thumbnail_url, category_id, photosensitive_warning")
        .single();
      let error = updRes.error;
      let data: ContentItem | null = updRes.data as ContentItem | null;

      if (error && isMissingPhotosensitiveColumnError(error)) {
        const { photosensitive_warning: _p, ...withoutPs } = updatePayload;
        const retry = await supabase
          .from("videos")
          .update(withoutPs)
          .eq("id", editingVideoId)
          .eq("user_id", userId)
          .select("id, title, description, tags, created_at, visibility, views, thumbnail_url, category_id")
          .single();
        error = retry.error;
        data = retry.data
          ? ({ ...(retry.data as Record<string, unknown>), photosensitive_warning: editPhotosensitiveWarning } as ContentItem)
          : null;
      }

      if (error || !data) {
        setEditError("Не удалось сохранить изменения.");
        return;
      }

      const row = data as ContentItem;
      setContentItems((prev) => prev.map((v) => (v.id === row.id ? { ...v, ...row } : v)));
      setOwnVideos((prev) =>
        prev.map((v) =>
          v.id === row.id ? { ...v, title: row.title, thumbnail_url: row.thumbnail_url ?? null } : v,
        ),
      );
      cancelEditVideo();
    } catch {
      setEditError("Ошибка сохранения.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!userId) return;
    if (!window.confirm("Удалить это видео безвозвратно? Его нельзя будет восстановить.")) return;
    setDeletingVideoId(videoId);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: delErr } = await supabase.from("videos").delete().eq("id", videoId).eq("user_id", userId);
      if (delErr) {
        setError(delErr.message || "Не удалось удалить видео.");
        return;
      }
      setContentItems((prev) => prev.filter((v) => v.id !== videoId));
      setOwnVideos((prev) => prev.filter((v) => v.id !== videoId));
      if (editingVideoId === videoId) cancelEditVideo();
      setSuccess("Видео удалено.");
      window.setTimeout(() => setSuccess(""), 4000);
    } finally {
      setDeletingVideoId(null);
    }
  };

  const onSelectThumbCandidate = useCallback((c: ThumbCandidate) => {
    setSelectedThumbCandidateId(c.id);
    setThumbnailFile(c.file);
    thumbnailPreviewUrlRef.current = c.previewUrl;
    studioPosterUrlRef.current = c.previewUrl;
    setStudioPlayerPosterUrl(c.previewUrl);
    setUploadFieldErrors((prev) => ({ ...prev, thumbnailFile: undefined }));
    queueMicrotask(() => {
      applyStudioPosterRef.current?.();
      requestAnimationFrame(() => applyStudioPosterRef.current?.());
    });
  }, []);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-[#0c1120]">
      <header
        className={clsx(
          "sticky top-0 z-[60] flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0c1120]/95 px-3 backdrop-blur-md",
          "supports-[padding:max(0px)]:pt-[max(0.35rem,env(safe-area-inset-top))]",
          "lg:hidden",
        )}
      >
        <button
          type="button"
          aria-label="Открыть меню студии"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-400/25 bg-slate-950/60 text-cyan-200 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)] transition hover:bg-cyan-950/40"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">Студия</p>
          <p className="truncate text-[11px] text-slate-500">
            {activeNav === "upload"
              ? "Загрузка видео"
              : activeNav === "content"
                ? "Ваши видео"
                : activeNav === "stats"
                  ? "Статистика"
                  : activeNav === "channel_home"
                    ? "Внешний вид канала"
                    : activeNav === "incoming_reports"
                      ? "Жалобы на контент"
                      : "Плейлисты"}
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10"
        >
          На сайт
        </Link>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <button
          type="button"
          aria-label="Закрыть меню"
          className={clsx(
            "fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity lg:hidden",
            mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setMobileNavOpen(false)}
        />

        <StudioSidebar
          activeNav={activeNav}
          onSelect={goToStudioTab}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6 lg:py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {activeNav === "stats" ? <StudioStatsView channelStats={channelStats} /> : null}

          {activeNav === "upload" ? (
            <StudioUploadPanelLazy
              frameVideoRef={frameVideoRef}
              studioPlyrRef={studioPlyrRef}
              videoFile={videoFile}
              setVideoFile={setVideoFile}
              replacePreviewFromFile={replacePreviewFromFile}
              previewUrl={previewUrl}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              tagsInput={tagsInput}
              setTagsInput={setTagsInput}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              setIsCategoryManuallySelected={setIsCategoryManuallySelected}
              categories={categories}
              visibility={visibility}
              setVisibility={setVisibility}
              photosensitiveWarning={photosensitiveWarning}
              setPhotosensitiveWarning={setPhotosensitiveWarning}
              uploadFieldErrors={uploadFieldErrors}
              setUploadFieldErrors={setUploadFieldErrors}
              thumbCandidates={thumbCandidates}
              isCapturingThumbs={isCapturingThumbs}
              selectedThumbCandidateId={selectedThumbCandidateId}
              setSelectedThumbCandidateId={setSelectedThumbCandidateId}
              setThumbnailFile={setThumbnailFile}
              thumbCandidatesError={thumbCandidatesError}
              replaceThumbnailPreviewFromFile={replaceThumbnailPreviewFromFile}
              error={error}
              success={success}
              source={source}
              playerKey={playerKey}
              handlePublish={handlePublish}
              isPublishing={isPublishing}
              onSelectThumbCandidate={onSelectThumbCandidate}
            />
          ) : null}

          {activeNav === "content" ? (
            <StudioContentView
              contentItems={filteredStudioContent}
              contentTotalCount={contentItems.length}
              studioContentQuery={studioContentQuery}
              setStudioContentQuery={setStudioContentQuery}
              studioContentVisibility={studioContentVisibility}
              setStudioContentVisibility={setStudioContentVisibility}
              categories={categories}
              editingVideoId={editingVideoId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              editTagsInput={editTagsInput}
              setEditTagsInput={setEditTagsInput}
              editCategoryId={editCategoryId}
              setEditCategoryId={setEditCategoryId}
              editVisibility={editVisibility}
              setEditVisibility={setEditVisibility}
              editPhotosensitiveWarning={editPhotosensitiveWarning}
              setEditPhotosensitiveWarning={setEditPhotosensitiveWarning}
              editSaving={editSaving}
              editError={editError}
              editFieldErrors={editFieldErrors}
              setEditThumbnailFile={setEditThumbnailFile}
              onOpenEdit={openEditVideo}
              onCancelEdit={cancelEditVideo}
              onSaveEdit={handleSaveVideoEdit}
              onDeleteVideo={handleDeleteVideo}
              deletingVideoId={deletingVideoId}
            />
          ) : null}
          {activeNav === "playlists" ? (
            <StudioPlaylistsView
              playlistKind={playlistKind}
              setPlaylistKind={setPlaylistKind}
              playlistTitle={playlistTitle}
              setPlaylistTitle={setPlaylistTitle}
              playlistDescription={playlistDescription}
              setPlaylistDescription={setPlaylistDescription}
              playlistVisibility={playlistVisibility}
              setPlaylistVisibility={setPlaylistVisibility}
              playlistFieldErrors={playlistFieldErrors}
              selectedPlaylistVideoIds={selectedPlaylistVideoIds}
              setSelectedPlaylistVideoIds={setSelectedPlaylistVideoIds}
              ownVideos={ownVideos}
              allVideos={allVideos}
              onCreatePlaylist={handleCreatePlaylist}
              isCreatingPlaylist={isCreatingPlaylist}
              playlists={playlists}
              targetPlaylistIdForAdd={targetPlaylistIdForAdd}
              setTargetPlaylistIdForAdd={setTargetPlaylistIdForAdd}
              onAddVideosToPlaylist={handleAddVideosToPlaylist}
              isAddingVideosToPlaylist={isAddingVideosToPlaylist}
              expandedPlaylistId={expandedPlaylistId}
              playlistVideosDetail={playlistVideosDetail}
              loadingPlaylistDetailId={loadingPlaylistDetailId}
              onToggleExpandPlaylist={onToggleExpandPlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onRemoveVideoFromPlaylist={handleRemoveVideoFromPlaylist}
              deletingPlaylistId={deletingPlaylistId}
              playlistActionMessage={playlistActionMessage}
            />
          ) : null}
          {activeNav === "channel_home" ? <StudioChannelAppearancePanel /> : null}
          {activeNav === "incoming_reports" ? <StudioIncomingReports /> : null}
        </main>
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioInner />
    </Suspense>
  );
}
