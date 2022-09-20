import parseName from "./parse-name";

export default function hasLayerId(
  ids: string[],
  target: string,
  { strict = false }: { strict?: boolean } = {
    strict: false
  }
): boolean {
  return !!ids.find(id => {
    const { full, short, namespace } = parseName(id);
    if (strict) {
      return full === target;
    } else {
      const parsedTarget = parseName(target);
      return (
        short === parsedTarget.short &&
        (parsedTarget.namespace ? namespace === parsedTarget.namespace : true)
      );
    }
  });
}
