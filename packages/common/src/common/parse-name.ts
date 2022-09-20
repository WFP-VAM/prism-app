export default function parseName(
  name: string
): { full: string; namespace: string | undefined; short: string } {
  if (name.includes("__") || name.includes(":")) {
    const [namespace, _, short] = name.split(/(__|:)/);
    return { full: name, namespace, short };
  }

  return { full: name, namespace: undefined, short: name };
}
