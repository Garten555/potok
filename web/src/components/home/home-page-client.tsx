"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { CategoryChipsBar } from "@/components/home/category-chips-bar";
import { HomeVideoFeed } from "@/components/home/home-video-feed";
import type { HomeCategoryId } from "@/components/home/categories";

/** Главная: одна sticky-зона — шапка + чипы без зазора и без второго sticky с top: calc(...). */
export function HomePageClient() {
  const [activeCategory, setActiveCategory] = useState<HomeCategoryId>("all");

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
