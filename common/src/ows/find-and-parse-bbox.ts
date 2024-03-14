import { findTagText } from "../utils";
import parseBoundingBox from "./parse-bbox";

export default function findAndParseBoundingBox(
  xml: string
): Readonly<[number, number, number, number]> | undefined {
  const bbox = findTagText(xml, "ows:BoundingBox");
  return bbox ? parseBoundingBox(bbox) : undefined;
}
