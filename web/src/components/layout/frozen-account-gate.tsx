"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthState } from "@/components/auth/auth-context";
import { useAccountFrozen } from "@/components/layout/account-frozen-context";
import { isAllowedPathWhenFrozen } from "@/lib/account-frozen-paths";

type FrozenAccountGateProps = {
  children: React.ReactNode;
};

/** Замороженный аккаунт: редирект на заявку о разморозке (кроме /auth и /account/frozen). */
export function FrozenAccountGate({ children }: FrozenAccountGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthState();
  const { isFrozen } = useAccountFrozen();

  useEffect(() => {
    if (!isAuthenticated || isFrozen === null) return;
    if (isFrozen && !isAllowedPathWhenFrozen(pathname)) {
      router.replace("/account/frozen");
    }
  }, [isAuthenticated, isFrozen, pathname, router]);

  return <>{children}</>;
}
