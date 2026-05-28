import {
  ADMIN_ACCESS_PERMISSION,
  MAP_EXPORTS_MANAGE_PERMISSION,
} from 'utils/constants';
import {
  fetchPrismWhoami,
  invalidatePrismWhoamiSession,
} from 'utils/prismWhoamiSession';

export type ScheduleWhoamiResult = {
  isPrismAuthenticated: boolean;
  canManageSchedules: boolean;
};

const unauthenticated: ScheduleWhoamiResult = {
  isPrismAuthenticated: false,
  canManageSchedules: false,
};

/** Clear cached whoami (e.g. after OIDC redirect back into schedule mode). */
export function invalidateScheduleWhoamiSession(): void {
  invalidatePrismWhoamiSession();
}

/** Credentialed whoami probe for scheduled-map auth; deduped and cached per browser session. */
export async function fetchScheduleWhoamiSession(options?: {
  bypassCache?: boolean;
}): Promise<ScheduleWhoamiResult> {
  const data = await fetchPrismWhoami(options);
  if (!data) {
    return unauthenticated;
  }
  const permissions = data.permissions ?? [];
  return {
    isPrismAuthenticated: true,
    canManageSchedules:
      permissions.includes(MAP_EXPORTS_MANAGE_PERMISSION) ||
      permissions.includes(ADMIN_ACCESS_PERMISSION),
  };
}
