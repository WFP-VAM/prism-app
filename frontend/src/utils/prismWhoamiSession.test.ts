import { PRISM_WHOAMI_API_URL } from './constants';
import {
  fetchPrismWhoami,
  invalidatePrismWhoamiSession,
} from './prismWhoamiSession';

describe('fetchPrismWhoami', () => {
  afterEach(() => {
    invalidatePrismWhoamiSession();
    jest.restoreAllMocks();
  });

  test('returns null when whoami is not ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
    } as Response);

    await expect(fetchPrismWhoami()).resolves.toBeNull();
  });

  test('returns payload when authenticated', async () => {
    const payload = {
      user_id: 'uid-1',
      auth_provider: 'ciam',
      ciam_sub: 'sub-1',
      email: 'user@example.org',
      permissions: ['prism.content.view'],
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await expect(fetchPrismWhoami()).resolves.toEqual(payload);
  });

  test('reuses cached result', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        user_id: 'uid-1',
        auth_provider: 'ciam',
        ciam_sub: 'sub-1',
        email: null,
        permissions: [],
      }),
    } as Response);

    await fetchPrismWhoami();
    await fetchPrismWhoami();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(PRISM_WHOAMI_API_URL, {
      credentials: 'include',
    });
  });
});
