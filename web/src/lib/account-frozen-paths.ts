/** Маршруты, доступные при замороженном аккаунте (остальное — редирект на /account/frozen). */
const ALLOWED_WHEN_FROZEN_PREFIXES = ["/account/frozen", "/auth"] as const;

export function isAllowedPathWhenFrozen(pathname: string): boolean {
  return ALLOWED_WHEN_FROZEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Жёсткая модерационная блокировка: редирект на /account/moderation-suspended. */
const ALLOWED_WHEN_MODERATION_SUSPENDED = ["/account/moderation-suspended", "/auth", "/rules"] as const;

export function isAllowedPathWhenModerationSuspended(pathname: string): boolean {
  return ALLOWED_WHEN_MODERATION_SUSPENDED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
