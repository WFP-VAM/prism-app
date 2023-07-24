import { findTagArray, findTagText, hasTag } from "../utils";

export default function findAndParseKeywords(xml: string): string[] {
  if (hasTag(xml, "ows:Keywords")) {
    return findTagArray(xml, "ows:Keyword");
  }

  // example: <Keywords>municipalities, colombia, boundaries</Keywords>
  return findTagText(xml, "Keywords")?.split(", ") || [];
}
