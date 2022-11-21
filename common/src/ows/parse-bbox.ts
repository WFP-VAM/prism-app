import { findTagText } from "../utils";

export default function parseBoundingBox(
  xml: string
): Readonly<[number, number, number, number]> | undefined {
  const lowerCorner = findTagText(xml, "ows:LowerCorner");
  const upperCorner = findTagText(xml, "ows:UpperCorner");
  if (lowerCorner && upperCorner) {
    const [west, south] = lowerCorner.split(" ").map((str) => Number(str));
    const [east, north] = upperCorner.split(" ").map((str) => Number(str));
    return [west, south, east, north];
  }
  return undefined;
}
