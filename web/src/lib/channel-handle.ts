/**
 * Логика как в SQL: public.generate_channel_handle — адрес в URL из названия + суффикс id.
 * Нелатинские символы убираются; если основа короткая — «channel».
 */
export function generateChannelHandleFromName(channelName: string, userId: string): string {
  let base = channelName.toLowerCase().trim();
  base = base.replace(/\s+/g, "-");
  base = base.replace(/[^a-z0-9._-]+/g, "");
  base = base.replace(/[-._]{2,}/g, "-");
  base = base.replace(/^[-._]+|[-._]+$/g, "");

  if (base.length < 3) {
    base = "channel";
  }

  const suffix = userId.replace(/-/g, "").slice(0, 6);
  return `${base.slice(0, 23)}-${suffix}`.toLowerCase();
}
