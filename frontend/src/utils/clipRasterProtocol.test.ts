import type { Feature, Polygon } from 'geojson';

import {
  __resetClipRegistryForTests,
  Bbox3857,
  buildClipTileUrl,
  classifyTileAgainstClip,
  clipRingsToTilePixels,
  lngLatTo3857,
  meters3857ToLngLat,
  parseBboxParam,
  parseClipTileUrl,
  parseXYZBbox,
  registerClipPolygon,
  resolveTileBbox,
  tileXYZToBbox3857,
} from './clipRasterProtocol';

const MERCATOR_EXTENT = 20037508.342789244;

/** EPSG:3857 bbox built from lng/lat corners. */
function bbox3857FromLngLat(
  west: number,
  south: number,
  east: number,
  north: number,
): Bbox3857 {
  const [minX, minY] = lngLatTo3857([west, south]);
  const [maxX, maxY] = lngLatTo3857([east, north]);
  return [minX, minY, maxX, maxY];
}

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

afterEach(() => {
  __resetClipRegistryForTests();
});

describe('lngLatTo3857 / meters3857ToLngLat', () => {
  it('maps lng 180 to the mercator extent', () => {
    const [x] = lngLatTo3857([180, 0]);
    expect(x).toBeCloseTo(MERCATOR_EXTENT, 0);
  });

  it('round-trips lng/lat through 3857', () => {
    const [lng, lat] = meters3857ToLngLat(lngLatTo3857([12.34, -45.6]));
    expect(lng).toBeCloseTo(12.34, 6);
    expect(lat).toBeCloseTo(-45.6, 6);
  });
});

describe('parseBboxParam', () => {
  it('parses a WMS bbox query param', () => {
    expect(
      parseBboxParam('https://x/wms?service=WMS&bbox=1,2,3,4&format=png'),
    ).toEqual([1, 2, 3, 4]);
  });

  it('returns null when there is no bbox', () => {
    expect(parseBboxParam('https://x/tiles/1/2/3.png')).toBeNull();
  });
});

describe('tileXYZToBbox3857 / parseXYZBbox', () => {
  it('returns the full mercator extent for z=0', () => {
    const [minX, minY, maxX, maxY] = tileXYZToBbox3857(0, 0, 0);
    expect(minX).toBeCloseTo(-MERCATOR_EXTENT, 0);
    expect(minY).toBeCloseTo(-MERCATOR_EXTENT, 0);
    expect(maxX).toBeCloseTo(MERCATOR_EXTENT, 0);
    expect(maxY).toBeCloseTo(MERCATOR_EXTENT, 0);
  });

  it('splits z=1 into four quadrants', () => {
    const topLeft = tileXYZToBbox3857(1, 0, 0);
    expect(topLeft[0]).toBeCloseTo(-MERCATOR_EXTENT, 0); // minX
    expect(topLeft[3]).toBeCloseTo(MERCATOR_EXTENT, 0); // maxY
    expect(topLeft[2]).toBeCloseTo(0, 0); // maxX
    expect(topLeft[1]).toBeCloseTo(0, 0); // minY
  });

  it('parses z/x/y from an XYZ tile URL', () => {
    expect(parseXYZBbox('https://s3/tiles/2024_01_01/5/12/9.png')).toEqual(
      tileXYZToBbox3857(5, 12, 9),
    );
  });
});

describe('resolveTileBbox', () => {
  it('prefers the bbox param over the path', () => {
    expect(resolveTileBbox('https://x/wms?bbox=1,2,3,4&l=/5/6/7.png')).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('falls back to XYZ when no bbox param', () => {
    expect(resolveTileBbox('https://x/3/1/2.png')).toEqual(
      tileXYZToBbox3857(3, 1, 2),
    );
  });
});

describe('clipRingsToTilePixels', () => {
  it('maps the bbox corners to pixel corners (y flipped)', () => {
    const bbox: Bbox3857 = [0, 0, 100, 100];
    const rings = clipRingsToTilePixels(
      [
        [
          [0, 100],
          [100, 0],
        ],
      ],
      bbox,
      256,
      256,
    );
    // (minX,maxY) -> top-left (0,0); (maxX,minY) -> bottom-right (256,256)
    expect(rings[0][0]).toEqual([0, 0]);
    expect(rings[0][1]).toEqual([256, 256]);
  });
});

describe('classifyTileAgainstClip', () => {
  it('returns "outside" for a disjoint tile', () => {
    const tile = bbox3857FromLngLat(20, 20, 21, 21);
    expect(classifyTileAgainstClip(tile, squarePolygon)).toBe('outside');
  });

  it('returns "inside" for a tile fully within the polygon', () => {
    const tile = bbox3857FromLngLat(2, 2, 3, 3);
    expect(classifyTileAgainstClip(tile, squarePolygon)).toBe('inside');
  });

  it('returns "partial" for a tile straddling the border', () => {
    const tile = bbox3857FromLngLat(8, 8, 12, 12);
    expect(classifyTileAgainstClip(tile, squarePolygon)).toBe('partial');
  });

  it('returns "partial" when a polygon vertex sits inside the tile', () => {
    const tile = bbox3857FromLngLat(-1, -1, 1, 1);
    expect(classifyTileAgainstClip(tile, squarePolygon)).toBe('partial');
  });
});

describe('clip URL registry', () => {
  it('round-trips a clip tile URL', () => {
    const clipId = registerClipPolygon(squarePolygon);
    const realUrl = 'https://x/wms?bbox={bbox-epsg-3857}';
    const url = buildClipTileUrl(realUrl, clipId);
    expect(url).toBe(`clip://${clipId}/${realUrl}`);
    expect(parseClipTileUrl(url)).toEqual({ clipId, realUrl });
  });

  it('produces a stable id for identical geometry and a different id otherwise', () => {
    const a = registerClipPolygon(squarePolygon);
    const b = registerClipPolygon(squarePolygon);
    expect(a).toBe(b);

    const shifted: Feature<Polygon> = {
      ...squarePolygon,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [5, 5],
            [15, 5],
            [15, 15],
            [5, 15],
            [5, 5],
          ],
        ],
      },
    };
    expect(registerClipPolygon(shifted)).not.toBe(a);
  });

  it('returns null for non-clip URLs', () => {
    expect(parseClipTileUrl('https://x/1/2/3.png')).toBeNull();
  });
});
