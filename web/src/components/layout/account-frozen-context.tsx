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
  refresh: () => void;
};

const AccountFrozenContext = createContext<AccountFrozenContextValue | null>(null);

export function AccountFrozenProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthState();
  const [isFrozen, setIsFrozen] = useState<boolean | null>(null);

  const fetchFrozen = useCallback(async (cancelRef?: { current: boolean }) => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) {
      if (!cancelRef?.current) setIsFrozen(false);
      return;
    }
    const { data: row } = await supabase
      .from("users")
      .select("account_frozen_at")
      .eq("id", uid)
      .maybeSingle();
    if (cancelRef?.current) return;
    const fr = Boolean((row as { account_frozen_at?: string | null } | null)?.account_frozen_at);
    setIsFrozen(fr);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsFrozen(false);
      return;
    }
    setIsFrozen(null);
    const cancelRef = { current: false };
    void fetchFrozen(cancelRef);
    return () => {
      cancelRef.current = true;
    };
  }, [isAuthenticated, fetchFrozen]);

  const refresh = useCallback(() => {
    void fetchFrozen();
  }, [fetchFrozen]);

  const value = useMemo(() => ({ isFrozen, refresh }), [isFrozen, refresh]);

  return <AccountFrozenContext.Provider value={value}>{children}</AccountFrozenContext.Provider>;
}

export function useAccountFrozen() {
  const ctx = useContext(AccountFrozenContext);
  if (!ctx) {
    throw new Error("useAccountFrozen: провайдер AccountFrozenProvider не найден");
  }
  return ctx;
}
