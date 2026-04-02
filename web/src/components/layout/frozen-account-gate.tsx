"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ALLOWED_WHEN_FROZEN_PREFIXES = ["/account/frozen", "/auth"];

function isAllowedPathWhenFrozen(pathname: string): boolean {
  return ALLOWED_WHEN_FROZEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

type FrozenAccountGateProps = {
  isAuthenticated: boolean;
  children: React.ReactNode;
};

/** Замороженный аккаунт: редирект на заявку о разморозке (кроме /auth и самой страницы). */
export function FrozenAccountGate({ isAuthenticated, children }: FrozenAccountGateProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      const { data: row } = await supabase
        .from("users")
        .select("account_frozen_at")
        .eq("id", u.user.id)
        .maybeSingle();

      const fr = Boolean((row as { account_frozen_at?: string | null } | null)?.account_frozen_at);
      if (cancelled) return;
      if (fr && !isAllowedPathWhenFrozen(pathname)) {
        router.replace("/account/frozen");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, pathname, router]);

  return <>{children}</>;
}
