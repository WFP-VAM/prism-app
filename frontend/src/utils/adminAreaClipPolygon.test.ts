import type { BoundaryLayerProps } from 'config/types';
import * as configUtils from 'config/utils';

import {
  bboxOfClipPolygon,
  buildAdminAreaClipPolygonFromSelection,
  buildCountryClipPolygonFromBoundaryData,
  isBboxWithinBounds,
  resolveAdminAreaClipPolygon,
} from './adminAreaClipPolygon';

const boundaryLayer = {
  id: 'moz-adm1',
  adminCode: 'pcode',
} as BoundaryLayerProps;

describe('adminAreaClipPolygon', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('buildCountryClipPolygonFromBoundaryData unions all boundary features', () => {
    const polygon = buildCountryClipPolygonFromBoundaryData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { pcode: 'A' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { pcode: 'B' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [2, 0],
                [3, 0],
                [3, 1],
                [2, 1],
                [2, 0],
              ],
            ],
          },
        },
      ],
    });

    expect(polygon?.geometry.type).toBe('MultiPolygon');
  });

  test('resolveAdminAreaClipPolygon prefers preprocessed country mask when available', async () => {
    const preprocessedMask = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [10, 10],
            [11, 10],
            [11, 11],
            [10, 11],
            [10, 10],
          ],
        ],
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => preprocessedMask,
    }) as jest.Mock;

    const boundaryData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { pcode: 'A' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    };

    const polygon = await resolveAdminAreaClipPolygon({
      country: 'mozambique',
      selectedBoundaries: [],
      boundaryData,
      boundaryLayer,
      i18nLocale: { language: 'en' } as any,
      getLayerData: () => undefined,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/data/mozambique/admin-boundary-unified-polygon.json',
    );
    expect(polygon).toBe(preprocessedMask);
  });

  test('resolveAdminAreaClipPolygon falls back to boundary union when mask missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as jest.Mock;

    const boundaryData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { pcode: 'A' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    };

    const polygon = await resolveAdminAreaClipPolygon({
      country: 'honduras',
      selectedBoundaries: [],
      boundaryData,
      boundaryLayer,
      i18nLocale: { language: 'en' } as any,
      getLayerData: () => undefined,
    });

    expect(polygon?.geometry.type).toBe('Polygon');
  });

  test('resolveAdminAreaClipPolygon uses cached boundary data when props are undefined', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as jest.Mock;

    const cachedBoundaryData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { pcode: 'A' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    };

    const polygon = await resolveAdminAreaClipPolygon({
      country: 'honduras',
      selectedBoundaries: [],
      boundaryData: undefined,
      boundaryLayer,
      i18nLocale: { language: 'en' } as any,
      getLayerData: () => cachedBoundaryData as any,
    });

    expect(polygon?.geometry.type).toBe('Polygon');
  });

  test('resolveAdminAreaClipPolygon waits for boundary data when admin area selected', async () => {
    const polygon = await resolveAdminAreaClipPolygon({
      country: 'mozambique',
      selectedBoundaries: ['MOZ01'],
      boundaryData: undefined,
      boundaryLayer,
      i18nLocale: { language: 'en' } as any,
      getLayerData: () => undefined,
    });

    expect(polygon).toBeNull();
  });

  test('buildAdminAreaClipPolygonFromSelection unions PMTiles fragments', () => {
    const treeLayer = {
      id: 'admin_boundaries',
      adminCode: 'adm1_id',
      adminLevelCodes: ['adm1_id'],
      adminLevelNames: ['name'],
      adminLevelLocalNames: ['name'],
    } as BoundaryLayerProps;

    const treeData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Northern', adm1_id: 'MOZ01' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    };

    const admin1Layer = {
      id: 'universal_admin1_boundaries',
      format: 'pmtiles',
      adminCode: 'adm1_id',
      adminLevelCodes: ['adm1_id'],
    } as BoundaryLayerProps;

    jest.spyOn(configUtils, 'getBoundaryLayers').mockReturnValue([admin1Layer]);

    const pmtilesData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { adm1_id: 'MOZ01' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0.5, 0],
                [0.5, 0.5],
                [0, 0.5],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { adm1_id: 'MOZ01' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0.5, 0],
                [1, 0],
                [1, 0.5],
                [0.5, 0.5],
                [0.5, 0],
              ],
            ],
          },
        },
      ],
    };

    const polygon = buildAdminAreaClipPolygonFromSelection(
      ['MOZ01' as never],
      treeData as never,
      treeLayer,
      { language: 'en' } as any,
      layerId =>
        layerId === 'universal_admin1_boundaries'
          ? (pmtilesData as never)
          : undefined,
    );

    expect(polygon?.geometry.type).toBe('Polygon');
  });

  test('resolveAdminAreaClipPolygon uses ISO3-bound getLayerData for admin selection', async () => {
    const treeLayer = {
      id: 'admin_boundaries',
      adminCode: 'adm1_id',
      adminLevelCodes: ['adm1_id'],
      adminLevelNames: ['name'],
      adminLevelLocalNames: ['name'],
    } as BoundaryLayerProps;

    const treeData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Northern', adm1_id: 'MOZ01' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    };

    const admin1Layer = {
      id: 'universal_admin1_boundaries',
      format: 'pmtiles',
      adminCode: 'adm1_id',
      adminLevelCodes: ['adm1_id'],
    } as BoundaryLayerProps;

    jest.spyOn(configUtils, 'getBoundaryLayers').mockReturnValue([admin1Layer]);

    const cachedData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { adm1_id: 'MOZ01' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    };

    const polygon = await resolveAdminAreaClipPolygon({
      country: 'universal',
      selectedBoundaries: ['MOZ01'],
      boundaryData: treeData as never,
      boundaryLayer: treeLayer,
      i18nLocale: { language: 'en' } as any,
      getLayerData: layerId =>
        layerId === 'universal_admin1_boundaries'
          ? (cachedData as never)
          : undefined,
    });

    expect(polygon?.geometry.type).toBe('Polygon');
  });
});

describe('isBboxWithinBounds', () => {
  test('returns true when bbox is fully inside bounds with margin', () => {
    expect(isBboxWithinBounds([1, 1, 2, 2], [0, 0, 3, 3])).toBe(true);
  });

  test('returns false when bbox touches loaded bounds edge', () => {
    expect(isBboxWithinBounds([0, 0, 2, 2], [0, 0, 3, 3], 0.001)).toBe(false);
  });
});

describe('bboxOfClipPolygon', () => {
  test('computes bbox for a polygon feature', () => {
    const bbox = bboxOfClipPolygon({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [1, 2],
            [4, 2],
            [4, 5],
            [1, 5],
            [1, 2],
          ],
        ],
      },
    });

    expect(bbox).toEqual([1, 2, 4, 5]);
  });
});
