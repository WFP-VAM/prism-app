import type { FeatureCollection } from 'geojson';

import { resolveAnalysisZones } from './analysis-zones';

const localZones: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const loadLocalZones = jest.fn(async () => localZones);
const publicZonesUrl = jest.fn((path: string) =>
  path.startsWith('http') ? path : `https://prism.example/${path}`,
);

beforeEach(() => {
  loadLocalZones.mockClear();
  publicZonesUrl.mockClear();
});

describe('resolveAnalysisZones', () => {
  test('keeps an explicit zones path as a URL', async () => {
    const payload = await resolveAnalysisZones({
      zonesPath: 's3://bucket/zones.parquet',
      adminBoundariesPath: 'data/country/admin.json',
      isLocal: true,
      loadLocalZones,
      publicZonesUrl,
    });

    expect(payload).toEqual({ zones_url: 's3://bucket/zones.parquet' });
    expect(loadLocalZones).not.toHaveBeenCalled();
  });

  test('keeps a remote boundary URL', async () => {
    const payload = await resolveAnalysisZones({
      adminBoundariesPath: 'https://cdn.example/admin.json',
      isLocal: true,
      loadLocalZones,
      publicZonesUrl,
    });

    expect(payload).toEqual({
      zones_url: 'https://cdn.example/admin.json',
    });
    expect(publicZonesUrl).toHaveBeenCalledWith(
      'https://cdn.example/admin.json',
    );
    expect(loadLocalZones).not.toHaveBeenCalled();
  });

  test('sends the local GeoJSON when the API cannot fetch localhost', async () => {
    const payload = await resolveAnalysisZones({
      adminBoundariesPath: 'data/country/admin.json',
      isLocal: true,
      loadLocalZones,
      publicZonesUrl,
    });

    expect(payload).toEqual({ zones: localZones });
    expect(loadLocalZones).toHaveBeenCalledWith('data/country/admin.json');
    expect(publicZonesUrl).not.toHaveBeenCalled();
  });

  test('builds a public URL outside localhost', async () => {
    const payload = await resolveAnalysisZones({
      adminBoundariesPath: 'data/country/admin.json',
      isLocal: false,
      loadLocalZones,
      publicZonesUrl,
    });

    expect(payload).toEqual({
      zones_url: 'https://prism.example/data/country/admin.json',
    });
    expect(loadLocalZones).not.toHaveBeenCalled();
  });
});
