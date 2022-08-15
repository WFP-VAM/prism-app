import { findTagsByName } from "xml-utils";

export default function findTagArray(xml: string, tagName: string): string[] {
  const tags: string[] = [];
  findTagsByName(xml, tagName).forEach(tag => {
    if (tag && tag.inner) {
      tags.push(tag.inner);
    }
  });
  return tags;
}
