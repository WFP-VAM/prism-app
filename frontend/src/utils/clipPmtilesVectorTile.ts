import { VectorTile } from '@mapbox/vector-tile';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import centroid from '@turf/centroid';
import simplify from '@turf/simplify';
import type { Feature, MultiPolygon, Point, Polygon } from 'geojson';
import Protobuf from 'pbf';
import { fromGeojsonVt } from 'vt-pbf';

export type ClipPolygon = Feature<Polygon | MultiPolygon>;

const EMPTY_MVT = new Uint8Array();

/** Simplify once per clip polygon so point-in-polygon stays fast per tile. */
const CLIP_SIMPLIFY_TOLERANCE = 0.005;
const MVT_EXTENT = 4096;

const clipContextCache = new Map<
  string,
  { simplified: ClipPolygon; bbox: [number, number, number, number] }
>();

function clipCacheKey(polygon: ClipPolygon): string {
  return `${polygon.geometry.type}:${JSON.stringify(polygon.geometry.coordinates).length}`;
}

function getClipContext(polygon: ClipPolygon) {
  const key = clipCacheKey(polygon);
  const cached = clipContextCache.get(key);
  if (cached) {
    return cached;
  }

  const simplified = simplify(polygon, {
    tolerance: CLIP_SIMPLIFY_TOLERANCE,
    highQuality: false,
  }) as ClipPolygon;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  const polys =
    simplified.geometry.type === 'Polygon'
      ? [simplified.geometry.coordinates]
      : simplified.geometry.coordinates;
  polys.forEach(rings => {
    rings.forEach(ring => {
      ring.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      });
    });
  });

  const context = {
    simplified,
    bbox: [minLon, minLat, maxLon, maxLat] as [number, number, number, number],
  };
  clipContextCache.set(key, context);
  return context;
}

function tileBbox(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const n = 2 ** z;
  const minLon = (x / n) * 360 - 180;
  const maxLon = ((x + 1) / n) * 360 - 180;
  const minLat =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  const maxLat =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [minLon, minLat, maxLon, maxLat];
}

function bboxesIntersect(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]);
}

type MvtFeature = {
  type: number;
  geometry: number[][][];
  tags: Record<string, string | number | boolean>;
  id?: number;
};

/**
 * Keep vector-tile features whose centroid falls inside the clip polygon.
 * ponytail: ~3x faster than geometric intersect; border-straddling fields may
 * still render outside the country. Upgrade path is preprocess country PMTiles.
 */
export function clipMvtTileToPolygon(
  data: Uint8Array,
  z: number,
  x: number,
  y: number,
  clipPolygon: ClipPolygon,
): Uint8Array {
  if (!data.byteLength) {
    return data;
  }

  const { simplified, bbox } = getClipContext(clipPolygon);
  if (!bboxesIntersect(tileBbox(z, x, y), bbox)) {
    return EMPTY_MVT;
  }

  const tile = new VectorTile(new Protobuf(data));
  const clippedLayers: Record<string, { features: MvtFeature[] }> = {};

  for (const layerName of Object.keys(tile.layers)) {
    const layer = tile.layers[layerName];
    const keptFeatures: MvtFeature[] = [];

    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      const center = centroid(
        feature.toGeoJSON(x, y, z) as Feature<Polygon | MultiPolygon>,
      ) as Feature<Point>;

      if (!booleanPointInPolygon(center, simplified as ClipPolygon)) {
        continue;
      }

      keptFeatures.push({
        type: feature.type,
        geometry: feature
          .loadGeometry()
          .map(ring => ring.map(point => [point.x, point.y])),
        tags: feature.properties,
        ...(typeof feature.id === 'number' ? { id: feature.id } : {}),
      });
    }

    if (keptFeatures.length) {
      clippedLayers[layerName] = { features: keptFeatures };
    }
  }

  if (!Object.keys(clippedLayers).length) {
    return EMPTY_MVT;
  }

  const wrapped: Record<string, unknown> = {};
  for (const [name, layer] of Object.entries(clippedLayers)) {
    wrapped[name] = {
      features: layer.features,
      name,
      version: 2,
      extent: MVT_EXTENT,
    };
  }

  return new Uint8Array(
    fromGeojsonVt(wrapped, { version: 2, extent: MVT_EXTENT }),
  );
}
