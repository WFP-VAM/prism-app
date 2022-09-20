import { findTagByName } from "xml-utils";

export default function findTagText(xml: string, tagName: string): string | undefined {
  const tag = findTagByName(xml, tagName);
  if (tag?.inner) return tag.inner;
}