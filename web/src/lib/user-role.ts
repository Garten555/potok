/** Нормализация role из БД: пробелы, регистр. */
export function normalizeStaffRole(role: string | null | undefined): "admin" | "moderator" | null {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "admin") return "admin";
  if (r === "moderator") return "moderator";
  return null;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return normalizeStaffRole(role) !== null;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeStaffRole(role) === "admin";
}
