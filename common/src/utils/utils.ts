export function setTimeoutAsync(
  seconds: number,
  callback: () => any
): Promise<any> {
  // how do I error out if promise rejected
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, seconds * 1000);
  });
}

export function titlecase(text: string): string {
  return text[0].toUpperCase() + text.substring(1).toLowerCase();
}

// this is different than lodash's toArray
// lodash: toArray({ k: v }) returns [v]
// below: toArray({ k: v }) return [{ k: v }]
export function toArray(it: any): any[] {
  if (arguments.length === 0) {
    return [];
  }
  if (Array.isArray(it)) {
    return it;
  }
  return [it];
}
