import { findTagArray } from "../common";

export default function findAndParseKeywords(xml: string): string[] {
  return findTagArray(xml, "ows:Keyword");
}
