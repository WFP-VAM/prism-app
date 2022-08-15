export default function isNil(it: undefined | null | "" | any): boolean {
  return it === undefined || it === null || it === "";
}
