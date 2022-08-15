export default function bboxToString(bbox: Readonly<number[]> | number[] | Readonly<string[]> | string[] | (number | string)[], bbox_digits?: number): string {
  return bbox.map(n => {
    if (typeof n === "number") {
      if (typeof bbox_digits === "number") {
        return n.toFixed(bbox_digits);
      } else {
        return n.toString();
      }
    }
    return n;
  }).toString();
}
