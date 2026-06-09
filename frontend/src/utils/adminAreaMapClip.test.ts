import type { Map } from 'maplibre-gl';

import {
  adminAreaFeatureToClipPath,
  applyAdminAreaClipPath,
} from './adminAreaMapClip';

describe('adminAreaMapClip', () => {
  const map = {
    project: ([lng, lat]: [number, number]) => ({
      x: lng * 10,
      y: lat * 10,
    }),
  } as unknown as Map;

  test('builds a polygon clip-path for a single admin area', () => {
    const clipPath = adminAreaFeatureToClipPath(
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
      map,
    );

    expect(clipPath).toBe(
      'polygon(0px 0px, 20px 0px, 20px 10px, 0px 10px, 0px 0px)',
    );
  });

  test('clears clip-path when feature is missing', () => {
    const container = document.createElement('div');
    container.style.clipPath = 'polygon(0px 0px, 1px 1px)';

    applyAdminAreaClipPath(map, container, null);

    expect(container.style.clipPath).toBe('');
  });
});
