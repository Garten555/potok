import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  channelHandleBoost,
  extractTokens,
  matchStrength,
  normalizeSearch,
  tokenHitsInText,
} from "@/lib/search-relevance";
import { fuzzyRankPhraseCandidates } from "@/lib/search-query-suggest";

export type SuggestChannel = {
  type: "channel";
  id: string;
  channel_name: string;
  channel_handle: string | null;
  avatar_url: string | null;
  matchScore: number;
};

type UserRowRaw = {
  id: string;
  channel_name: string | null;
  channel_handle: string | null;
  avatar_url: string | null;
  subscribers_count?: number | null;
};

/** Убираем % и _ из строки запроса, чтобы не ломать ilike. */
function sanitizeIlikeFragment(s: string): string {
  return s.replace(/[%_\\]/g, "").trim();
}

/**
 * Серверные подсказки: каналы + фразы (fuzzy по истории с клиента + данные БД).
 */
export async function loadSearchSuggest(qRaw: string, history: string[]): Promise<{
  channels: SuggestChannel[];
  phrases: string[];
}> {
  const q = sanitizeIlikeFragment(qRaw);
  if (q.length < 2) {
    return { channels: [], phrases: [] };
  }

  const supabase = await createSupabaseServerClient();
  const tokens = extractTokens(q);

  const [{ data: titlesMatch }, { data: titlesPrefix }, { data: channelsRaw }] = await Promise.all([
    supabase
      .from("videos")
      .select("title")
      .in("visibility", ["public", "unlisted"])
      .ilike("title", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(45),
    supabase
      .from("videos")
      .select("title")
      .in("visibility", ["public", "unlisted"])
      .ilike("title", `${q}%`)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("users")
      .select("id,channel_name,channel_handle,avatar_url,subscribers_count")
      .or(`channel_name.ilike.%${q}%,channel_handle.ilike.%${q}%`)
      .order("subscribers_count", { ascending: false })
      .limit(10),
  ]);

  const titleSet = new Set<string>();
  for (const row of [...(titlesMatch ?? []), ...(titlesPrefix ?? [])]) {
    const t = String((row as { title?: string }).title ?? "").trim();
    if (t.length >= 2) titleSet.add(t);
  }
  const titleSamples = [...titleSet];

  const channels = (channelsRaw ?? []) as UserRowRaw[];
  const scoredChannels: SuggestChannel[] = channels.map((ch) => {
    const name = String(ch.channel_name ?? "");
    const handle = (ch.channel_handle as string) ?? null;
    const subs = typeof ch.subscribers_count === "number" ? ch.subscribers_count : 0;
    const nameScore = matchStrength(q, name);
    const handleScore = channelHandleBoost(q, handle);
    const subBoost = Math.min(28, Math.round(Math.log10(subs + 10) * 8));
    const tokenB = tokenHitsInText(`${name} ${handle ?? ""}`, tokens) * 12;
    return {
      type: "channel" as const,
      id: String(ch.id),
      channel_name: name,
      channel_handle: handle,
      avatar_url: (ch.avatar_url as string) ?? null,
      matchScore: nameScore * 1.1 + handleScore + tokenB + subBoost,
    };
  });

  scoredChannels.sort((a, b) => b.matchScore - a.matchScore);

  const candidates: string[] = [...history, ...titleSamples];
  for (const c of scoredChannels) {
    candidates.push(c.channel_name);
    if (c.channel_handle) candidates.push(`@${c.channel_handle}`);
  }

  const phrases =
    normalizeSearch(q).length >= 2
      ? fuzzyRankPhraseCandidates(q, candidates, 10)
      : [];

  return { channels: scoredChannels, phrases };
}
