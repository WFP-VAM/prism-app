import type { BoundaryLayerProps } from 'config/types';

import {
  buildCountryClipPolygonFromBoundaryData,
  resolveAdminAreaClipPolygon,
} from './adminAreaClipPolygon';

const boundaryLayer = {
  id: 'moz-adm1',
  adminCode: 'pcode',
} as BoundaryLayerProps;

describe('adminAreaClipPolygon', () => {
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

  test('resolveAdminAreaClipPolygon uses whole country when no admin area selected', async () => {
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
});
