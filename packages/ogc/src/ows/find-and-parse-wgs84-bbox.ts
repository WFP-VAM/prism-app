import { findTagByName } from "xml-utils";

import { findTagText } from "../common";
import parseBoundingBox from "./parse-bbox";

export default function parseWGS84BoundingBox(
  xml: string
): Readonly<[number, number, number, number]> | undefined {
  const bbox = findTagText(xml, "ows:WGS84BoundingBox");
  if (bbox) {
    return parseBoundingBox(bbox);
  }
}
