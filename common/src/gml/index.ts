import { findTagByName } from "xml-utils";
import { findTagText } from "../utils";

export function parseEnvelope(
  xml: string
): Readonly<[number, number, number, number]> {
  const lowerCorner = findTagText(xml, "gml:lowerCorner");
  const upperCorner = findTagText(xml, "gml:upperCorner");
  if (!lowerCorner || !upperCorner) {
    throw new Error("unable to parse envelope");
  }
  const [xmin, ymin] = lowerCorner.split(" ").map((n) => Number(n));
  const [xmax, ymax] = upperCorner.split(" ").map((n) => Number(n));
  return [xmin, ymin, xmax, ymax];
}

export function findAndParseEnvelope(
  xml: string
): Readonly<[number, number, number, number]> | undefined {
  const envelope = findTagByName(xml, "gml:Envelope")?.outer;
  return envelope ? parseEnvelope(envelope) : undefined;
}
