"use client";

import { createContext, useContext } from "react";

type AuthState = {
  isAuthenticated: boolean;
};

const AuthStateContext = createContext<AuthState | null>(null);

type AuthStateProviderProps = {
  value: AuthState;
  children: React.ReactNode;
};

export function AuthStateProvider({ value, children }: AuthStateProviderProps) {
  return (
    <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error("useAuthState: провайдер AuthStateProvider не найден");
  }
  return context;
}
