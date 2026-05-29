import {
  ADMIN_ACCESS_PERMISSION,
  MAP_EXPORTS_MANAGE_PERMISSION,
  PRISM_WHOAMI_API_URL,
} from 'utils/constants';

import {
  fetchScheduleWhoamiSession,
  invalidateScheduleWhoamiSession,
} from './scheduleWhoamiSession';

describe('fetchScheduleWhoamiSession', () => {
  afterEach(() => {
    invalidateScheduleWhoamiSession();
    jest.restoreAllMocks();
  });

  test('returns unauthenticated when whoami is not ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
    } as Response);

    await expect(fetchScheduleWhoamiSession()).resolves.toEqual({
      isPrismAuthenticated: false,
      canManageSchedules: false,
    });
  });

  test('detects map export manage permission', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        permissions: [MAP_EXPORTS_MANAGE_PERMISSION],
      }),
    } as Response);

    await expect(fetchScheduleWhoamiSession()).resolves.toEqual({
      isPrismAuthenticated: true,
      canManageSchedules: true,
    });
  });

  test('detects admin access permission', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        permissions: [ADMIN_ACCESS_PERMISSION],
      }),
    } as Response);

    await expect(fetchScheduleWhoamiSession()).resolves.toEqual({
      isPrismAuthenticated: true,
      canManageSchedules: true,
    });
  });

  test('invalidateScheduleWhoamiSession clears shared cache', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        permissions: [MAP_EXPORTS_MANAGE_PERMISSION],
      }),
    } as Response);

    await fetchScheduleWhoamiSession();
    await fetchScheduleWhoamiSession();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    invalidateScheduleWhoamiSession();
    await fetchScheduleWhoamiSession();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(PRISM_WHOAMI_API_URL, {
      credentials: 'include',
    });
  });
});
