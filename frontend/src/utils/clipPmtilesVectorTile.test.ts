import { VectorTile } from '@mapbox/vector-tile';
import type { Feature, Polygon } from 'geojson';
import Protobuf from 'pbf';
import { fromGeojsonVt } from 'vt-pbf';

import { clipMvtTileToPolygon } from './clipPmtilesVectorTile';

// Clip polygon: a 20°×20° square around (0, 0).
const clipPolygon: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-10, -10],
        [10, -10],
        [10, 10],
        [-10, 10],
        [-10, -10],
      ],
    ],
  },
};

function square(cx: number, cy: number, half: number) {
  return [
    [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx + half, cy + half],
      [cx - half, cy + half],
      [cx - half, cy - half],
    ],
  ];
}

// FTW 2024 PMTiles use extent 1024 (2025 uses 4096).
function buildTile(extent: number) {
  const c = extent / 2;
  return new Uint8Array(
    fromGeojsonVt(
      {
        fields: {
          features: [
            // Centered on (0, 0): inside the clip polygon.
            { type: 3, geometry: square(c, c, extent / 128), tags: { id: 1 } },
            // Top-left of the world tile: far outside.
            {
              type: 3,
              geometry: square(extent / 8, extent / 8, extent / 128),
              tags: { id: 2 },
            },
          ],
        },
      },
      { version: 2, extent },
    ),
  );
}

describe('clipMvtTileToPolygon', () => {
  test.each([1024, 4096])(
    'keeps inside features in place for extent %i',
    extent => {
      const clipped = clipMvtTileToPolygon(
        buildTile(extent),
        0,
        0,
        0,
        clipPolygon,
      );
      const layer = new VectorTile(new Protobuf(clipped)).layers.fields;

      expect(layer.extent).toBe(extent);
      expect(layer.length).toBe(1);
      const kept = layer.feature(0);
      expect(kept.properties.id).toBe(1);
      // Geometry must stay where it was (not rescaled toward the tile origin).
      const [lng, lat] = (kept.toGeoJSON(0, 0, 0).geometry as Polygon)
        .coordinates[0][0];
      expect(Math.abs(lng)).toBeLessThan(10);
      expect(Math.abs(lat)).toBeLessThan(10);
    },
  );
});
