import type { BBOX } from '../types';

export function bboxToString(
  bbox:
    | Readonly<number[]>
    | number[]
    | Readonly<string[]>
    | string[]
    | (number | string)[],
  bbox_digits?: number,
): string {
  return bbox
    .map(n => {
      if (typeof n === 'number') {
        if (typeof bbox_digits === 'number') {
          return n.toFixed(bbox_digits);
        }
        return n.toString();
      }
      return n;
    })
    .toString();
}

export function checkExtent(extent: BBOX): void {
  const [minX, minY, maxX, maxY] = extent;
  if (minX > maxX || minY > maxY) {
    throw new Error(
      `the extent ${extent} seems malformed or else may contain "wrapping" which is not supported`,
    );
  }
}
