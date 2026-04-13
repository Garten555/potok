/**
 * Канонический URL сайта для SEO (metadataBase, sitemap, robots).
 * В продакшене задайте NEXT_PUBLIC_SITE_URL, например https://example.com
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export function getMetadataBase(): URL {
  return new URL(`${siteUrl()}/`);
}
