import type { User, Session } from "@supabase/supabase-js";

/** Минимальный снимок пользователя для UI и API (без привязки к конкретному провайдеру в компонентах). */
export type AuthUserSnapshot = {
  id: string;
  email: string | undefined;
};

export type SessionSnapshot = {
  user: AuthUserSnapshot | null;
  session: Session | null;
};

export type { User, Session };
