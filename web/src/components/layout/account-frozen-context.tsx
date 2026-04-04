"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuthState } from "@/components/auth/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountFrozenContextValue = {
  /** null — ещё не загрузили (пользователь вошёл). */
  isFrozen: boolean | null;
  /** Жёсткая модерационная блокировка (6 мес., без апелляции) — отдельный гейт. */
  isModerationHardSuspended: boolean | null;
  refresh: () => void;
};

const AccountFrozenContext = createContext<AccountFrozenContextValue | null>(null);

export function AccountFrozenProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthState();
  const [isFrozen, setIsFrozen] = useState<boolean | null>(null);
  const [isModerationHardSuspended, setIsModerationHardSuspended] = useState<boolean | null>(null);

  const fetchFrozen = useCallback(async (cancelRef?: { current: boolean }) => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) {
      if (!cancelRef?.current) {
        setIsFrozen(false);
        setIsModerationHardSuspended(false);
      }
      return;
    }
    const { data: row } = await supabase
      .from("users")
      .select("account_frozen_at, moderation_hard_freeze_until, moderation_no_appeal")
      .eq("id", uid)
      .maybeSingle();
    if (cancelRef?.current) return;
    const fr = Boolean((row as { account_frozen_at?: string | null } | null)?.account_frozen_at);
    const hardUntil = (row as { moderation_hard_freeze_until?: string | null } | null)
      ?.moderation_hard_freeze_until;
    const noAppeal = Boolean((row as { moderation_no_appeal?: boolean | null } | null)?.moderation_no_appeal);
    const hardActive =
      Boolean(hardUntil && new Date(hardUntil).getTime() > Date.now()) && noAppeal;
    setIsFrozen(fr);
    setIsModerationHardSuspended(hardActive);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsFrozen(false);
      setIsModerationHardSuspended(false);
      return;
    }
    setIsFrozen(null);
    setIsModerationHardSuspended(null);
    const cancelRef = { current: false };
    void fetchFrozen(cancelRef);
    return () => {
      cancelRef.current = true;
    };
  }, [isAuthenticated, fetchFrozen]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    const channelRef: { current: ReturnType<typeof supabase.channel> | null } = { current: null };

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid || cancelled) return;
      const ch = supabase
        .channel(`users-self-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${uid}` },
          () => {
            void fetchFrozen();
          },
        )
        .subscribe();
      if (cancelled) {
        void supabase.removeChannel(ch);
        return;
      }
      channelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [isAuthenticated, fetchFrozen]);

  const refresh = useCallback(() => {
    void fetchFrozen();
  }, [fetchFrozen]);

  const value = useMemo(
    () => ({ isFrozen, isModerationHardSuspended, refresh }),
    [isFrozen, isModerationHardSuspended, refresh],
  );

  return <AccountFrozenContext.Provider value={value}>{children}</AccountFrozenContext.Provider>;
}

export function useAccountFrozen() {
  const ctx = useContext(AccountFrozenContext);
  if (!ctx) {
    throw new Error("useAccountFrozen: провайдер AccountFrozenProvider не найден");
  }
  return ctx;
}
