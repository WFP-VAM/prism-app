import { findTagText } from "../utils";
import parseBoundingBox from "./parse-bbox";

export default function parseWGS84BoundingBox(
  xml: string
): Readonly<[number, number, number, number]> | undefined {
  const bbox = findTagText(xml, "ows:WGS84BoundingBox");
  if (bbox) {
    return parseBoundingBox(bbox);
  }
  return undefined;
}
