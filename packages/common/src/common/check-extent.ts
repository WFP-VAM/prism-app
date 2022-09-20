import type { BBOX } from "../types";
export default function checkExtent(extent: BBOX): void {
  const [minX, minY, maxX, maxY] = extent;
  if (minX > maxX || minY > maxY) {
    throw new Error(
      `the extent ${extent} seems malformed or else may contain "wrapping" which is not supported`,
    );
  }
}
