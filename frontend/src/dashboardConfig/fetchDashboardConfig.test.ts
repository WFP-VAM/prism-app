import { fetchDashboardConfig } from './fetchDashboardConfig';
import { DashboardElementType } from 'config/types';

const validBody = [
  {
    title: 'T',
    firstColumn: [{ type: DashboardElementType.TEXT, content: 'c' }],
  },
];

describe('fetchDashboardConfig', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns validated dashboards on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(validBody),
    } as unknown as Response);

    const url = 'https://example.com/mozambique/dashboard.json';
    const data = await fetchDashboardConfig(url);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('T');
    expect(global.fetch).toHaveBeenCalledWith(url, { cache: 'no-store' });
  });

  it('throws DashboardConfigFetchError on network failure', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      name: 'DashboardConfigFetchError',
      causeType: 'network',
    });
  });

  it('throws on non-OK HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Not Found',
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      name: 'DashboardConfigFetchError',
      causeType: 'http',
      status: 404,
    });
  });

  it('throws on 200 non-JSON body (hosts must not mask missing files with HTML)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<!doctype html><html></html>',
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      causeType: 'json',
    });
  });

  it('throws on invalid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => '{ not valid json',
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      causeType: 'json',
    });
  });

  it('returns empty dashboards when body is empty (missing file)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      text: async () => '',
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).resolves.toEqual([]);
  });

  it('throws validation error for invalid body shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ not: 'array' }),
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      causeType: 'validation',
    });
  });
});
