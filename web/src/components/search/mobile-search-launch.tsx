"use client";

import Link from "next/link";
import { Search } from "lucide-react";

/** На узких экранах полноценный поиск в шапке не помещается — переход на страницу /search. */
export function MobileSearchLaunch() {
  return (
    <Link
      href="/search"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-[0.98]"
      aria-label="Открыть поиск"
    >
      <Search className="h-4 w-4" />
    </Link>
  );
}
