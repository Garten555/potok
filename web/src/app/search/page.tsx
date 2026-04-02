import { AppHeader } from "@/components/layout/app-header";
import { SearchResults } from "@/components/search/search-results";

type SearchPageProps = {
  searchParams?: {
    q?: string | string[];
  };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const qParam = sp?.q;
  const q = Array.isArray(qParam) ? qParam[0] : qParam;

  return (
    <div>
      <AppHeader />
      {q ? <SearchResults query={q} /> : <div className="pb-8 px-4 pt-6 text-sm text-slate-300">Введите запрос в поиске.</div>}
    </div>
  );
}

