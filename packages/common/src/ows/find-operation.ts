import { getAttribute } from "xml-utils";

import findOperations from "./find-operations";

export default function findOperation(
  xml: string,
  name: string
): string | undefined {
  return findOperations(xml)?.find((op) => getAttribute(op, "name") === name);
}
