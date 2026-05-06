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

  const jsonHeaders = new Headers({ 'content-type': 'application/json' });

  it('returns validated dashboards on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: jsonHeaders,
      json: async () => validBody,
    } as unknown as Response);

    const data = await fetchDashboardConfig(
      'https://example.com/mozambique/dashboard.json',
    );
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('T');
  });

  it('treats 200 + HTML (SPA fallback) as a 404 so the UI stays silent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      name: 'DashboardConfigFetchError',
      causeType: 'http',
      status: 404,
    });
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

  it('throws on invalid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: jsonHeaders,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      causeType: 'json',
    });
  });

  it('throws validation error for invalid body shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: jsonHeaders,
      json: async () => ({ not: 'array' }),
    } as unknown as Response);

    await expect(
      fetchDashboardConfig('https://example.com/x/dashboard.json'),
    ).rejects.toMatchObject({
      causeType: 'validation',
    });
  });
});
