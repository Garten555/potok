import Link from "next/link";

export type RecommendationItem = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number | null;
  created_at: string | null;
};

type RecommendationsPanelProps = {
  items: RecommendationItem[];
};

export function RecommendationsPanel({ items }: RecommendationsPanelProps) {
  return (
    <aside className="rounded-xl border border-white/10 bg-[#0c1323]/80 p-3">
      <h2 className="text-sm font-semibold text-slate-100">Следующее</h2>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => {
            const published = item.created_at
              ? new Date(item.created_at).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null;
            return (
              <Link
                key={item.id}
                href={`/watch/${item.id}`}
                className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 transition hover:bg-white/[0.06]"
              >
                <div
                  className="aspect-video w-40 shrink-0 rounded-md bg-[#0b1323] bg-cover bg-center"
                  style={item.thumbnail_url ? { backgroundImage: `url(${item.thumbnail_url})` } : undefined}
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium text-slate-100">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {(item.views ?? 0).toLocaleString("ru-RU")} просмотров
                    {published ? (
                      <>
                        {" · "}
                        {published}
                      </>
                    ) : null}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-slate-400">Пока нет рекомендаций.</p>
        )}
      </div>
    </aside>
  );
}

