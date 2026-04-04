/** Нормализованные роли персонала (не user). */
export type StaffRoleTier = "moderator" | "admin" | "owner";

/** Нормализация role из БД: пробелы, регистр. */
export function normalizeStaffRole(role: string | null | undefined): StaffRoleTier | null {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "owner") return "owner";
  if (r === "admin") return "admin";
  if (r === "moderator") return "moderator";
  return null;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return normalizeStaffRole(role) !== null;
}

/** Администратор или владелец (расширенные права: разморозка, команда, бан и т.д.). */
export function isAdminRole(role: string | null | undefined): boolean {
  const t = normalizeStaffRole(role);
  return t === "admin" || t === "owner";
}

export function isOwnerRole(role: string | null | undefined): boolean {
  return normalizeStaffRole(role) === "owner";
}

/**
 * Может ли staff удалить чужой комментарий с учётом роли автора.
 * owner — любые; admin — user и moderator; moderator — только user.
 */
export function staffCanDeleteComment(
  staffRole: string | null | undefined,
  authorRole: string | null | undefined,
): boolean {
  const s = normalizeStaffRole(staffRole);
  if (!s) return false;
  const a = (authorRole ?? "user").trim().toLowerCase();
  if (s === "owner") return true;
  if (s === "admin") return a === "user" || a === "moderator";
  if (s === "moderator") return a === "user";
  return false;
}

/** Подпись роли в UI (шапка, админка). */
export function staffRoleLabelRu(role: string | null | undefined): string | null {
  const t = normalizeStaffRole(role);
  if (!t) return null;
  if (t === "owner") return "Владелец платформы";
  if (t === "admin") return "Администратор";
  return "Модератор";
}
