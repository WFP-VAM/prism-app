import { findTagByName, getAttribute } from "xml-utils";

import findOperation from "./find-operation";
import { titlecase } from "../utils";

export default function findAndParseOperationUrl(
  xml: string,
  op: string,
  method: "GET" | "POST" | "Get" | "Post" = "Get"
): string | undefined {
  const xmlOp = findOperation(xml, op);
  if (!xmlOp) {
    return undefined;
  }
  const xmlMethod = findTagByName(xmlOp, `ows:${titlecase(method)}`)?.outer;
  if (!xmlMethod) {
    return undefined;
  }
  return getAttribute(xmlMethod, "xlink:href");
}
