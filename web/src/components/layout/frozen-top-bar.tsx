"use client";

import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Узкая шапка на странице заморозки: без поиска и навигации по сайту. */
export function FrozenTopBar() {
  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="w-full max-w-full min-w-0 border-b border-white/8 bg-[#0a0d14]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex min-h-[3.25rem] w-full items-center justify-between gap-3 px-3 sm:px-4 md:px-6">
        <Link
          href="/account/frozen"
          className="flex shrink-0 items-center outline-none ring-cyan-500/40 focus-visible:ring-2"
          aria-current="page"
        >
          <div
            className="h-8 w-[4.25rem] bg-[url('/logo.svg')] bg-contain bg-left bg-no-repeat sm:h-9 sm:w-28 md:h-10 md:w-32"
            aria-hidden
          />
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
