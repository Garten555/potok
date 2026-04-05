export const MAX_VIDEO_TAGS = 20;
export const MAX_VIDEO_TAG_LEN = 48;

/** Нормализация одного тега для хранения: без #, в нижнем регистре. */
export function normalizeOneTag(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("#")) t = t.slice(1).trim();
  return t.toLowerCase();
}

/** Проверка готового списка тегов перед сохранением в БД. */
export function validateVideoTagList(tags: string[]): string | undefined {
  if (tags.length > MAX_VIDEO_TAGS) {
    return `Не больше ${MAX_VIDEO_TAGS} тегов.`;
  }
  const seen = new Set<string>();
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    if (t.length > MAX_VIDEO_TAG_LEN) {
      return `Тег не длиннее ${MAX_VIDEO_TAG_LEN} символов.`;
    }
    if (seen.has(t)) continue;
    seen.add(t);
  }
  return undefined;
}
