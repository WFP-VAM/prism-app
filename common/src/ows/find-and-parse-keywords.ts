import { findTagArray } from "../utils";

export default function findAndParseKeywords(xml: string): string[] {
  return findTagArray(xml, "ows:Keyword");
}
