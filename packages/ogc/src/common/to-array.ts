export default function toArray(it: any): any[] {
  if (arguments.length === 0) return [];
  if (Array.isArray(it)) return it;
  return [it];
}
