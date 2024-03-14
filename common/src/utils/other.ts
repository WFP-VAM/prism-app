import { parseName } from "./parse";

export function formatUrl(
  baseUrl: string,
  params: { [key: string]: undefined | boolean | number | string } = {},
  {
    debug = false,
    sortParams = true,
  }: { debug?: boolean; sortParams?: boolean } = {
    debug: false,
    sortParams: true,
  }
): string {
  const url = new URL(baseUrl);
  const keys = Object.keys(params);
  if (sortParams) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("[format-url] sorting keys");
    }
    // eslint-disable-next-line fp/no-mutating-methods
    keys.sort();
  }
  keys.forEach((k) => {
    const value = params[k];
    // don't want ?param=undefined in url
    if (value === undefined) {
      return;
    }
    url.searchParams.append(k, value.toString());
  });
  return url.toString();
}

export function hasLayerId(
  ids: string[],
  target: string,
  { strict = false }: { strict?: boolean } = {
    strict: false,
  }
): boolean {
  return !!ids.find((id) => {
    const { full, short, namespace } = parseName(id);
    if (strict) {
      return full === target;
    }
    const parsedTarget = parseName(target);
    return (
      short === parsedTarget.short &&
      (parsedTarget.namespace ? namespace === parsedTarget.namespace : true)
    );
  });
}
