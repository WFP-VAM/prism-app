/* eslint-disable no-bitwise, fp/no-mutation */

// https://stackoverflow.com/a/7616484
export const stringHash = (s: string): string => {
  let hash = 0;

  if (typeof s !== 'string' || s.length === 0) {
    return hash.toString();
  }

  for (let i = 0; i < s.length; i += 1) {
    const chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer - bitwise or and assign the result to "hash"
  }

  return hash.toString();
};
