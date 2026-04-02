import { Config, Query, SearcherFactory } from "@m31coding/fuzzy-search";
import { normalizeSearch } from "@/lib/search-relevance";

/**
 * Ранжирование текстовых подсказок для строки поиска.
 * Использует @m31coding/fuzzy-search: fuzzy + prefix + substring, многоязычно (кириллица/латиница).
 * @see https://www.npmjs.com/package/@m31coding/fuzzy-search
 */
export function fuzzyRankPhraseCandidates(query: string, candidates: string[], topN = 12): string[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const uniq = Array.from(
    new Map(
      candidates
        .map((c) => c.trim())
        .filter((c) => c.length >= 2)
        .map((c) => [normalizeSearch(c), c] as const),
    ).values(),
  );

  if (uniq.length === 0) return [];

  const config = Config.createDefaultConfig();
  config.normalizerConfig.allowCharacter = () => true;

  const searcher = SearcherFactory.createSearcher<string, string>(config);
  searcher.indexEntities(
    uniq,
    (e) => e,
    (e) => [e],
  );

  const nq = normalizeSearch(q);
  const result = searcher.getMatches(new Query(q, topN + 5));

  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of result.matches) {
    const s = String(m.entity).trim();
    if (!s) continue;
    const k = normalizeSearch(s);
    if (k === nq) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= topN) break;
  }
  return out;
}
