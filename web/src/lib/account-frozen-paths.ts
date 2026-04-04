/** Маршруты, доступные при замороженном аккаунте (остальное — редирект на /account/frozen). */
const ALLOWED_WHEN_FROZEN_PREFIXES = ["/account/frozen", "/auth"] as const;

export function isAllowedPathWhenFrozen(pathname: string): boolean {
  return ALLOWED_WHEN_FROZEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
