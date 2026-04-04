"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthState } from "@/components/auth/auth-context";
import { useAccountFrozen } from "@/components/layout/account-frozen-context";
import { isAllowedPathWhenModerationSuspended } from "@/lib/account-frozen-paths";

type ModerationSuspendedGateProps = {
  children: React.ReactNode;
};

/** Жёсткая модерационная блокировка (6 мес., без апелляции): редирект с ограничением маршрутов. */
export function ModerationSuspendedGate({ children }: ModerationSuspendedGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthState();
  const { isFrozen, isModerationHardSuspended } = useAccountFrozen();

  useEffect(() => {
    if (!isAuthenticated || isFrozen === null || isModerationHardSuspended === null) return;
    if (isFrozen) return;
    if (isModerationHardSuspended && !isAllowedPathWhenModerationSuspended(pathname)) {
      router.replace("/account/moderation-suspended");
    }
  }, [isAuthenticated, isFrozen, isModerationHardSuspended, pathname, router]);

  return <>{children}</>;
}
