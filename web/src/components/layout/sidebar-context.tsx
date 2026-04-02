"use client";

import { createContext, useContext } from "react";

type SidebarState = {
  isOpen: boolean;
  toggleSidebar: () => void;
};

const SidebarStateContext = createContext<SidebarState | null>(null);

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

export function useSidebarState() {
  const context = useContext(SidebarStateContext);

  if (!context) {
    throw new Error(
      "useSidebarState: провайдер SidebarStateProvider не найден выше по дереву",
    );
  }

  return context;
}
