import type { BBOX } from "../types";

export function bboxToString(
  bbox:
    | Readonly<number[]>
    | number[]
    | Readonly<string[]>
    | string[]
    | Array<number | string>,
  bboxDigits?: number
): string {
  const [xmin, ymin, xmax, ymax] = bbox;
  return [
    typeof xmin === "number" && typeof bboxDigits === "number"
      ? xmin.toFixed(bboxDigits)
      : xmin.toString(),
    typeof ymin === "number" && typeof bboxDigits === "number"
      ? ymin.toFixed(bboxDigits)
      : ymin.toString(),
    typeof xmax === "number" && typeof bboxDigits === "number"
      ? xmax.toFixed(bboxDigits)
      : xmax.toString(),
    typeof ymax === "number" && typeof bboxDigits === "number"
      ? ymax.toFixed(bboxDigits)
      : ymax.toString(),
  ].toString();
}

export function checkExtent(extent: BBOX): void {
  const [minX, minY, maxX, maxY] = extent;
  if (minX > maxX || minY > maxY) {
    throw new Error(
      `the extent ${extent} seems malformed or else may contain "wrapping" which is not supported`
    );
  }
}
