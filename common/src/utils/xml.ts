import { castArray } from "lodash";
import {
  findTagByName,
  findTagByPath,
  findTagsByPath,
  getAttribute,
} from "xml-utils";

export function findTagArray(
  xml: string,
  tagNameOrPath: string | string[],
): string[] {
  return findTagsByPath(xml, castArray(tagNameOrPath))
    .filter((tag) => tag.inner !== null)
    .map((tag) => tag.inner!);
}

export function findTagText(xml: string, tagName: string): string | undefined {
  const tag = findTagByName(xml, tagName);
  return tag?.inner || undefined;
}

export function findTagAttribute(
  xml: string,
  tagNameOrPath: string | string[],
  attribute: string,
): string | undefined {
  const tag = findTagByPath(xml, castArray(tagNameOrPath));
  if (!tag) {
    return undefined;
  }

  const value = getAttribute(tag, attribute);
  if (value) {
    return value;
  }

  return undefined;
}

export function hasTag(xml: string, tagNameOrPath: string | string[]): boolean {
  return findTagsByPath(xml, castArray(tagNameOrPath)).length > 0;
}
