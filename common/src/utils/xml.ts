import { castArray } from "lodash";
import { findTagByName, findTagsByPath } from "xml-utils";

export function findTagArray(
  xml: string,
  tagNameOrPath: string | string[]
): string[] {
  return findTagsByPath(xml, castArray(tagNameOrPath))
    .filter((tag) => tag.inner !== null)
    .map((tag) => tag.inner!);
}

export function findTagText(xml: string, tagName: string): string | undefined {
  const tag = findTagByName(xml, tagName);
  return tag?.inner || undefined;
}
