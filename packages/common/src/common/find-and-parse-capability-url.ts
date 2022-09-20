import { getAttribute, findTagByPath } from "xml-utils";

export default function findAndParseCapabilityUrl(
  xml: string,
  capability: string
): string | undefined {
  const onlineResource = findTagByPath(xml, [
    "Capability",
    "Request",
    capability,
    "OnlineResource"
  ]);
  if (onlineResource) return getAttribute(onlineResource.outer, "xlink:href");
}
