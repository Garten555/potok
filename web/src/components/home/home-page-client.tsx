"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { CategoryChipsBar } from "@/components/home/category-chips-bar";
import { HomeVideoFeed } from "@/components/home/home-video-feed";
import type { HomeCategoryId } from "@/components/home/categories";
import { HOME_FEED_QUERY_KEY } from "@/lib/home-feed-param";

type HomePageClientProps = {
  /** Сервер: `/?f=t` или устаревший `?tab=trending` — лента «Недавно опубликованные». */
  openTrendingFeed?: boolean;
};

/** Главная: одна sticky-зона — шапка + чипы без зазора и без второго sticky с top: calc(...). */
export function HomePageClient({ openTrendingFeed = false }: HomePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<HomeCategoryId>(
    openTrendingFeed ? "recent" : "all",
  );

  useEffect(() => {
    const f = searchParams.get(HOME_FEED_QUERY_KEY);
    const tab = searchParams.get("tab");
    if (f === "t" || tab === "trending") {
      setActiveCategory("recent");
      router.replace("/", { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <div className="min-w-0 max-w-full">
      <div className="sticky top-0 z-20 w-full min-w-0">
        <AppHeader embedded />
        <CategoryChipsBar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      </div>
      <HomeVideoFeed activeCategory={activeCategory} />
    </div>
  );
}
