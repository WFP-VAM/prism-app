import type { AffineTransform } from './raster-utils';
import {
  getPublicCogUrls,
  getStacTransformOverride,
  overviewsFollowTransform,
  toPublicCogUrl,
} from './raster-utils';

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
            properties: {
              'proj:transform': [0.05, 0, -180, 0, -0.05, 60, 0, 0, 1],
            },
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
        transform: [0.05, 0, -180, 0, -0.05, 60],
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

describe('getStacTransformOverride', () => {
  // CHIRPS-GEFS dekad forecast, 7200 x 2400: header geotransform from gdalinfo
  // vs the STAC item's proj:transform.
  const FLOAT32_RES = 0.0500000007450581;
  const HEADER: AffineTransform = [FLOAT32_RES, 0, -180, 0, -FLOAT32_RES, 60];
  const STAC: AffineTransform = [0.05, 0, -180, 0, -0.05, 60];

  it('prefers the STAC transform over float32 rounding in the header', () => {
    expect(HEADER[2] + 7200 * HEADER[0]).toBeGreaterThan(180);
    const override = getStacTransformOverride(HEADER, STAC, 7200, 2400);
    expect(override).toBe(STAC);
    expect(override![2] + 7200 * override![0]).toBe(180);
  });

  it('keeps the header when the grids differ by more than rounding', () => {
    // Half-pixel shift, e.g. a cell-center vs cell-corner mix-up.
    const shifted: AffineTransform = [0.05, 0, -179.975, 0, -0.05, 60];
    expect(
      getStacTransformOverride(HEADER, shifted, 7200, 2400),
    ).toBeUndefined();
  });

  it('keeps the header when the item has no transform', () => {
    expect(
      getStacTransformOverride(HEADER, undefined, 7200, 2400),
    ).toBeUndefined();
  });

  // Overviews scaled from a full-resolution transform, as
  // @developmentseed/geotiff derives them.
  const overviewsOf = (transform: AffineTransform) =>
    [2, 4, 8].map(factor => ({
      width: 7200 / factor,
      height: 2400 / factor,
      transform: [
        transform[0] * factor,
        0,
        transform[2],
        0,
        transform[4] * factor,
        transform[5],
      ] as AffineTransform,
    }));

  it('detects overviews that follow the overridden transform', () => {
    const image = { width: 7200, height: 2400, overviews: overviewsOf(STAC) };
    expect(overviewsFollowTransform(image, STAC)).toBe(true);
  });

  it('detects overviews that still use the header transform', () => {
    const image = { width: 7200, height: 2400, overviews: overviewsOf(HEADER) };
    expect(overviewsFollowTransform(image, STAC)).toBe(false);
  });
});
