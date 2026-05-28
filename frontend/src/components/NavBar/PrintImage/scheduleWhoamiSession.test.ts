import {
  ADMIN_ACCESS_PERMISSION,
  MAP_EXPORTS_MANAGE_PERMISSION,
} from 'utils/constants';
import {
  fetchPrismWhoami,
  invalidatePrismWhoamiSession,
} from 'utils/prismWhoamiSession';

import {
  fetchScheduleWhoamiSession,
  invalidateScheduleWhoamiSession,
} from './scheduleWhoamiSession';

jest.mock('utils/prismWhoamiSession', () => ({
  fetchPrismWhoami: jest.fn(),
  invalidatePrismWhoamiSession: jest.fn(),
}));

const fetchPrismWhoamiMock = fetchPrismWhoami as jest.MockedFunction<
  typeof fetchPrismWhoami
>;

describe('fetchScheduleWhoamiSession', () => {
  beforeEach(() => {
    fetchPrismWhoamiMock.mockReset();
  });

  test('returns unauthenticated when whoami is not ok', async () => {
    fetchPrismWhoamiMock.mockResolvedValue(null);

    await expect(fetchScheduleWhoamiSession()).resolves.toEqual({
      isPrismAuthenticated: false,
      canManageSchedules: false,
    });
  });

  test('detects map export manage permission', async () => {
    fetchPrismWhoamiMock.mockResolvedValue({
      user_id: 'uid-1',
      ciam_sub: 'sub-1',
      email: null,
      permissions: [MAP_EXPORTS_MANAGE_PERMISSION],
    });

    await expect(fetchScheduleWhoamiSession()).resolves.toEqual({
      isPrismAuthenticated: true,
      canManageSchedules: true,
    });
  });

  test('detects admin access permission', async () => {
    fetchPrismWhoamiMock.mockResolvedValue({
      user_id: 'uid-1',
      ciam_sub: 'sub-1',
      email: null,
      permissions: [ADMIN_ACCESS_PERMISSION],
    });

    await expect(fetchScheduleWhoamiSession()).resolves.toEqual({
      isPrismAuthenticated: true,
      canManageSchedules: true,
    });
  });

  test('invalidateScheduleWhoamiSession clears shared cache', () => {
    invalidateScheduleWhoamiSession();
    expect(invalidatePrismWhoamiSession).toHaveBeenCalled();
  });
});
