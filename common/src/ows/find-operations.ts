import { findTagsByPath } from "xml-utils";

export default function findOperations(xml: string): string[] {
  return findTagsByPath(xml, ["ows:OperationsMetadata", "ows:Operation"]).map(
    (tag) => tag.outer
  );
}
