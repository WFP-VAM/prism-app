import { findTagByPath, getAttribute } from "xml-utils";
import { findTagText } from "./xml";

export function findAndParseAbstract(
  xml: string,
  { trim = true }: { trim?: boolean } = { trim: true }
) {
  let abstract = findTagText(xml, "Abstract");
  if (!abstract) {
    return undefined;
  }
  if (trim) {
    // eslint-disable-next-line fp/no-mutation
    abstract = abstract.trim();
  }
  return abstract;
}

export function findAndParseCapabilityUrl(
  xml: string,
  capability: string
): string | undefined {
  const onlineResource = findTagByPath(xml, [
    "Capability",
    "Request",
    capability,
    "OnlineResource",
  ]);
  if (onlineResource) {
    return getAttribute(onlineResource.outer, "xlink:href");
  }
  return undefined;
}

export function findName(xml: string): string | undefined {
  return findTagText(xml, "Name");
}

export function parseName(
  name: string
): { full: string; namespace: string | undefined; short: string } {
  if (name.includes("__") || name.includes(":")) {
    const [namespace, , short] = name.split(/(__|:)/);
    return { full: name, namespace, short };
  }

  return { full: name, namespace: undefined, short: name };
}

export async function parseService(
  url: string,
  { raw = false } = { raw: false }
) {
  const { pathname, searchParams } = new URL(url);

  if (searchParams.has("service") && searchParams.get("service") !== "") {
    const service = searchParams.get("service")!; // we know it's not null because of searchParams.has('service')
    return raw ? service : service.toLowerCase();
  }

  const match = /(wcs|wfs|wms|wmts|wps)\/?$/i.exec(pathname);
  if (match) {
    const service = match[0];
    return raw ? service : service.toLowerCase();
  }

  return undefined;
}
