import {
  ADMIN_ACCESS_PERMISSION,
  MAP_EXPORTS_MANAGE_PERMISSION,
  PRISM_WHOAMI_API_URL,
} from 'utils/constants';

export type ScheduleWhoamiSessionStatus =
  | 'authenticated'
  | 'unauthorized'
  | 'network_error';

export type ScheduleWhoamiResult = {
  isPrismAuthenticated: boolean;
  canManageSchedules: boolean;
  sessionStatus: ScheduleWhoamiSessionStatus;
};

const unauthenticated: ScheduleWhoamiResult = {
  isPrismAuthenticated: false,
  canManageSchedules: false,
  sessionStatus: 'unauthorized',
};

let cached: ScheduleWhoamiResult | null = null;
let inflight: Promise<ScheduleWhoamiResult> | null = null;

/** Clear cached whoami (e.g. after OIDC redirect back into schedule mode). */
export function invalidateScheduleWhoamiSession(): void {
  cached = null;
  inflight = null;
}

async function requestWhoami(): Promise<ScheduleWhoamiResult> {
  try {
    const response = await fetch(PRISM_WHOAMI_API_URL, {
      credentials: 'include',
    });
    if (!response.ok) {
      return unauthenticated;
    }
    const data = (await response.json()) as { permissions?: string[] };
    const permissions = data.permissions ?? [];
    return {
      isPrismAuthenticated: true,
      canManageSchedules:
        permissions.includes(MAP_EXPORTS_MANAGE_PERMISSION) ||
        permissions.includes(ADMIN_ACCESS_PERMISSION),
      sessionStatus: 'authenticated',
    };
  } catch {
    return {
      ...unauthenticated,
      sessionStatus: 'network_error',
    };
  }
}

/** Credentialed whoami probe for scheduled-map auth; deduped and cached per browser session. */
export function fetchScheduleWhoamiSession(options?: {
  bypassCache?: boolean;
}): Promise<ScheduleWhoamiResult> {
  if (!options?.bypassCache && cached !== null) {
    return Promise.resolve(cached);
  }
  if (!options?.bypassCache && inflight !== null) {
    return inflight;
  }

  const request = requestWhoami().then(result => {
    cached = result;
    inflight = null;
    return result;
  });
  inflight = request;
  return request;
}
