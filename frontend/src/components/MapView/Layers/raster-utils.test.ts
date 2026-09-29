import { getPublicCogUrls, toPublicCogUrl } from './raster-utils';

const SOURCE_COOP_HREF =
  's3://eu-central-1.opendata.source.coop/wfp/chirps-dekad-forecast/v3.0/2026/09/21/c3g_2026.09.3.tif';
const SOURCE_COOP_URL =
  'https://data.source.coop/wfp/chirps-dekad-forecast/v3.0/2026/09/21/c3g_2026.09.3.tif';

describe('toPublicCogUrl', () => {
  it('rewrites source.coop s3 hrefs to the public data endpoint', () => {
    expect(toPublicCogUrl(SOURCE_COOP_HREF)).toBe(SOURCE_COOP_URL);
  });

  it('passes https hrefs through', () => {
    expect(toPublicCogUrl('https://example.com/file.tif')).toBe(
      'https://example.com/file.tif',
    );
  });

  it('rejects private s3 hrefs', () => {
    expect(() => toPublicCogUrl('s3://wfp-hdc-data/cog/file.tif')).toThrow(
      'not publicly accessible',
    );
  });
});

describe('getPublicCogUrls', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('searches STAC for the date and returns public URLs', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            id: 'chirps_dekad_forecast-202609d3',
            bbox: [-180, -60, 180, 60],
            assets: { band: { href: SOURCE_COOP_HREF } },
          },
        ],
      }),
    }) as jest.Mock;

    const urls = await getPublicCogUrls(
      'chirps_dekad_forecast',
      '2026-09-21',
      'band',
      [92, 9, 102, 29],
    );

    expect(urls).toEqual([
      {
        item_id: 'chirps_dekad_forecast-202609d3',
        url: SOURCE_COOP_URL,
        bbox: [-180, -60, 180, 60],
        public: true,
      },
    ]);
    const requestUrl = new URL((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(requestUrl.pathname).toBe('/stac/search');
    expect(requestUrl.searchParams.get('collections')).toBe(
      'chirps_dekad_forecast',
    );
    expect(requestUrl.searchParams.get('datetime')).toBe(
      '2026-09-21T00:00:00Z/2026-09-21T23:59:59Z',
    );
    expect(requestUrl.searchParams.get('bbox')).toBe('92,9,102,29');
  });

  it('throws when the STAC search fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;

    await expect(
      getPublicCogUrls('chirps_dekad_forecast', '2026-09-21'),
    ).rejects.toThrow('STAC search failed');
  });
});
