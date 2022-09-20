export default function formatUrl(
  baseUrl: string,
  params: { [key: string]: undefined | boolean | number | string } = {},
  { debug = false, sortParams = true }: { debug?: boolean, sortParams?: boolean } = { debug: false, sortParams: true }
): string {
  const url = new URL(baseUrl);
  const keys = Object.keys(params);
  if (sortParams) {
    if (debug) console.log("[format-url] sorting keys");
    keys.sort();
  }
  keys.forEach((k) => {
    const value = params[k];
    // don't want ?param=undefined in url
    if (value === undefined) return;
    url.searchParams.append(k, value.toString());
  });
  return url.toString();
}
