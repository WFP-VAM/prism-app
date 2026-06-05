/** Human-readable /export URL for clipboard (decoded query params). */
export function formatExportUrlForClipboard(exportUrl: string): string {
  const parsed = new URL(exportUrl);
  const readableSearch = Array.from(
    parsed.searchParams.entries(),
    ([key, value]) => `${key}=${value}`,
  ).join('&');

  return readableSearch
    ? `${parsed.origin}${parsed.pathname}?${readableSearch}`
    : `${parsed.origin}${parsed.pathname}`;
}
