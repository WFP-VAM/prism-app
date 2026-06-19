import type { AdminCodeString } from 'config/types';

/** Coerce boundary property values to comparable admin codes (handles numeric IDs). */
export function normalizeAdminCode(value: unknown): AdminCodeString | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return String(value) as AdminCodeString;
}

export function adminCodesEqual(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeAdminCode(left);
  const normalizedRight = normalizeAdminCode(right);
  return (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    normalizedLeft === normalizedRight
  );
}
