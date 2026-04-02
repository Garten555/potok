import {
  Config,
  SearcherFactory,
  Query,
  FuzzySearcher,
  SubstringSearcher,
  PrefixSearcher,
} from "@m31coding/fuzzy-search";

function createSearcher<TEntity, TId>() {
  const config = Config.createDefaultConfig();
  config.normalizerConfig.allowCharacter = () => true;
  return SearcherFactory.createSearcher<TEntity, TId>(config);
}

/**
 * Поиск с допуском опечаток и без учёта регистра (в т.ч. кириллица).
 * Пустая строка запроса — возвращает все элементы без изменений.
 */
export function fuzzyFilterEntities<T>(
  items: T[],
  getId: (item: T) => string,
  getTerms: (item: T) => string[],
  rawQuery: string,
): T[] {
  const q = rawQuery.trim();
  if (!q) return items;
  if (items.length === 0) return [];

  const searcher = createSearcher<T, string>();
  searcher.indexEntities(items, getId, getTerms);
  const result = searcher.getMatches(
    new Query(q, Infinity, [new FuzzySearcher(0.24), new SubstringSearcher(0), new PrefixSearcher(0)]),
  );

  const seen = new Set<string>();
  const out: T[] = [];
  for (const m of result.matches) {
    const id = getId(m.entity);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(m.entity);
  }
  return out;
}
