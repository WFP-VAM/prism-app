import findTagText from "./find-tag-text";

export default function findAndParseAbstract(xml: string, { trim = true }: { trim?: boolean } = { trim: true }) {
  let abstract = findTagText(xml, "Abstract");
  if (!abstract) return undefined;
  if (trim) abstract = abstract.trim();
  return abstract;
}
