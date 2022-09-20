import { findTagByName } from "xml-utils";

export default function findName(xml: string): string | undefined {
  const tag = findTagByName(xml, "Name");
  if (tag?.inner) return tag.inner;
}
