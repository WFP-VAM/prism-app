import type { Feature, Polygon } from 'geojson';
import { lngLatTo3857 } from 'utils/clipRasterProtocol';

import { applyDeploymentClip, geotiffTileBbox3857 } from './deploymentClip';

const squarePolygon: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  },
};

describe('geotiffTileBbox3857', () => {
  test('maps a 3857 tile from pixel corners', () => {
    const image = {
      tileWidth: 256,
      tileHeight: 256,
      crs: 3857,
      xy: (row: number, col: number, offset?: string) => {
        const x = col * 10 + (offset === 'lr' ? 10 : 0);
        const y = -row * 10 - (offset === 'lr' ? 10 : 0);
        return [x, y] as [number, number];
      },
    };

    const bbox = geotiffTileBbox3857(image, 0, 0, 256, 256);
    expect(bbox[0]).toBe(0);
    expect(bbox[1]).toBe(-2560);
    expect(bbox[2]).toBe(2560);
    expect(bbox[3]).toBeCloseTo(0);
  });

  test('converts 4326 tile corners to 3857', () => {
    const image = {
      tileWidth: 2,
      tileHeight: 2,
      crs: 4326,
      xy: (row: number, col: number, offset?: string) => {
        const lng = col + (offset === 'lr' ? 1 : 0);
        const lat = 10 - row - (offset === 'lr' ? 1 : 0);
        return [lng, lat] as [number, number];
      },
    };

    const bbox = geotiffTileBbox3857(image, 0, 0, 2, 2);
    const [minX] = lngLatTo3857([0, 8]);
    const [maxX] = lngLatTo3857([2, 10]);
    expect(bbox[0]).toBeCloseTo(minX, 0);
    expect(bbox[2]).toBeCloseTo(maxX, 0);
  });
});

describe('applyDeploymentClip', () => {
  test('zeros an entirely outside tile', () => {
    const raw = new Float32Array([1, 2, 3, 4]);
    // Tile far from the [0,10]×[0,10] square.
    const far = lngLatTo3857([100, 0]);
    const bbox: [number, number, number, number] = [
      far[0],
      far[1] - 1000,
      far[0] + 1000,
      far[1] + 1000,
    ];
    applyDeploymentClip(raw, 2, 2, bbox, squarePolygon, 0);
    expect(Array.from(raw)).toEqual([0, 0, 0, 0]);
  });

  test('leaves an entirely inside tile untouched', () => {
    const raw = new Float32Array([1, 2, 3, 4]);
    const sw = lngLatTo3857([2, 2]);
    const ne = lngLatTo3857([3, 3]);
    const bbox: [number, number, number, number] = [sw[0], sw[1], ne[0], ne[1]];
    applyDeploymentClip(raw, 2, 2, bbox, squarePolygon, 0);
    expect(Array.from(raw)).toEqual([1, 2, 3, 4]);
  });
});
