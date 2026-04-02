"use client";

import { createContext, useContext } from "react";

type SidebarState = {
  isOpen: boolean;
  toggleSidebar: () => void;
};

const SidebarStateContext = createContext<SidebarState | null>(null);

/** Если компонент оказался вне AppShell (редкий кейс / тест) — не падаем. */
const fallbackSidebarState: SidebarState = {
  isOpen: false,
  toggleSidebar: () => {},
};

type SidebarStateProviderProps = {
  value: SidebarState;
  children: React.ReactNode;
};

export function SidebarStateProvider({
  value,
  children,
}: SidebarStateProviderProps) {
  return (
    <SidebarStateContext.Provider value={value}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState(): SidebarState {
  const context = useContext(SidebarStateContext);
  return context ?? fallbackSidebarState;
}
