import { findTagByName, findTagByPath, getAttribute } from "xml-utils";
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

export function findVersion(xml: string): string | undefined {
  const tagNames = [
    // wcs
    "WCS_Capabilities",
    "wcs:Capabilities",
    "wcs:CoverageDescriptions",
    "wcs:CoverageDescription",
    "CoverageDescriptions",
    "CoverageDescription",

    // wms
    "WMS_Capabilities",
    "WMT_MS_Capabilities",

    // wfs
    "wfs:WFS_Capabilities",

    // other
    "ServiceExceptionReport",
  ];
  // eslint-disable-next-line fp/no-mutation
  for (let i = 0; i < tagNames.length; i += 1) {
    const tagName = tagNames[i];
    const tag = findTagByName(xml, tagName);
    if (tag) {
      const version = getAttribute(tag.outer, "version");
      if (version) {
        return version;
      }
    }
  }

  // if haven't found version yet, try to grab it from the wcs:xmlns attribute
  // eslint-disable-next-line fp/no-mutation
  for (let i = 0; i < tagNames.length; i += 1) {
    const tagName = tagNames[i];
    const tag = findTagByName(xml, tagName);
    if (tag) {
      const link = getAttribute(tag.outer, "xmlns:wcs");
      if (link.endsWith("2.0")) {
        return "2.0.0";
      }
    }
  }

  return undefined;
}

export function parseName(
  name: string
): {
  full: string;
  namespace: string | undefined;
  short: string;
} {
  if (name.includes("__") || name.includes(":")) {
    const [namespace, , short] = name.split(/(__|:)/);
    return { full: name, namespace, short };
  }

  return { full: name, namespace: undefined, short: name };
}

export function parseService(
  url: string,
  options?: { case?: "lower" | "raw" | "upper" }
) {
  const { pathname, searchParams } = new URL(url);

  if (searchParams.has("service") && searchParams.get("service") !== "") {
    const service = searchParams.get("service")!; // we know it's not null because of searchParams.has('service')
    switch (options?.case) {
      case "lower":
        return service.toLowerCase();
      case "upper":
        return service.toUpperCase();
      default:
        return service;
    }
  }

  const match = /(wcs|wfs|wms|wmts|wps)\/?$/i.exec(pathname);
  if (match) {
    const service = match[0];
    switch (options?.case) {
      case "lower":
        return service.toLowerCase();
      case "upper":
        return service.toUpperCase();
      default:
        return service;
    }
  }

  return undefined;
}
