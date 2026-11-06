import { fetchJsonOrNull } from './fetchJsonOrNull';

describe('fetchJsonOrNull', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const jsonHeaders = new Headers({ 'content-type': 'application/json' });

  it('returns the parsed body on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: jsonHeaders,
      json: async () => ({ a: 1 }),
    } as unknown as Response);

    const data = await fetchJsonOrNull('/data/mozambique/some.json');
    expect(data).toEqual({ a: 1 });
  });

  it('returns null on HTTP 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as unknown as Response);

    await expect(fetchJsonOrNull('/data/x/missing.json')).resolves.toBeNull();
  });

  it('returns null on 200 + HTML (SPA fallback)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    await expect(fetchJsonOrNull('/data/x/missing.json')).resolves.toBeNull();
  });

  it('throws JsonFetchError on network failure', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchJsonOrNull('/data/x/some.json')).rejects.toMatchObject({
      name: 'JsonFetchError',
      causeType: 'network',
    });
  });

  it('throws JsonFetchError on non-OK statuses other than 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as Response);

    await expect(fetchJsonOrNull('/data/x/some.json')).rejects.toMatchObject({
      name: 'JsonFetchError',
      causeType: 'http',
      status: 500,
    });
  });

  it('throws JsonFetchError on invalid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: jsonHeaders,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);

    await expect(fetchJsonOrNull('/data/x/broken.json')).rejects.toMatchObject({
      name: 'JsonFetchError',
      causeType: 'json',
    });
  });
});
