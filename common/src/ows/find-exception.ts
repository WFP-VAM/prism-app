import { findTagText } from "../utils";

export default function findException(xml: string): string | undefined {
  return (
    findTagText(xml, "ows:ExceptionText") ||
    findTagText(xml, "ServiceException")
  )?.trim();
}
