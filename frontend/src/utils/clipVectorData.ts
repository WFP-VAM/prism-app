/**
 * Source-level vector clipping for MapLibre.
 *
 * Clips a GeoJSON FeatureCollection to an admin-area polygon ONCE at load time
 * (the vector analogue of the `clip://` raster protocol):
 *  - Polygon / MultiPolygon features are geometrically clipped with turf.
 *  - Point / MultiPoint features are filtered by point-in-polygon.
 *  - Other geometry types pass through unchanged.
 *
 * Results are memoized by (FeatureCollection reference, clipId) so the clipped
 * data keeps a stable reference and does not churn the MapLibre source.
 */
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import centroid from '@turf/centroid';
import { featureCollection, point } from '@turf/helpers';
import intersect from '@turf/intersect';
import simplify from '@turf/simplify';
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from 'geojson';

export type ClipPolygon = Feature<Polygon | MultiPolygon>;

const memo = new WeakMap<FeatureCollection, Map<string, FeatureCollection>>();

/** Simplified clip + bbox, keyed by clipId (stable for a given mask selection). */
const clipContextCache = new Map<
  string,
  { bbox: Bbox; simplified: ClipPolygon }
>();

type Bbox = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

/** Simplify complex regional masks once so point-in-polygon / intersect stay fast. */
const CLIP_SIMPLIFY_TOLERANCE = 0.005;

function updateBboxFromPosition(bbox: Bbox, [lng, lat]: Position): void {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return;
  }
  bbox[0] = Math.min(bbox[0], lng);
  bbox[1] = Math.min(bbox[1], lat);
  bbox[2] = Math.max(bbox[2], lng);
  bbox[3] = Math.max(bbox[3], lat);
}

function bboxOfPolygonOrMultiPolygon(geometry: Polygon | MultiPolygon): Bbox {
  const bbox: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
  const polys =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  polys.forEach(rings => {
    rings.forEach(ring => {
      ring.forEach(pos => updateBboxFromPosition(bbox, pos));
    });
  });
  return bbox;
}

function bboxCorners([minLng, minLat, maxLng, maxLat]: Bbox): Position[] {
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
  ];
}

function bboxDisjoint(a: Bbox, b: Bbox): boolean {
  return a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3];
}

function countBboxCornersInside(bbox: Bbox, clipPolygon: ClipPolygon): number {
  return bboxCorners(bbox).filter(corner =>
    booleanPointInPolygon(point(corner), clipPolygon),
  ).length;
}

function getClipContext(
  clipPolygon: ClipPolygon,
  clipId: string,
): { bbox: Bbox; simplified: ClipPolygon } {
  const cached = clipContextCache.get(clipId);
  if (cached) {
    return cached;
  }

  const simplified = simplify(clipPolygon, {
    tolerance: CLIP_SIMPLIFY_TOLERANCE,
    highQuality: false,
  }) as ClipPolygon;

  const context = {
    bbox: bboxOfPolygonOrMultiPolygon(clipPolygon.geometry),
    simplified,
  };
  clipContextCache.set(clipId, context);
  return context;
}

function clipPolygonFeature(
  feature: Feature<Polygon | MultiPolygon>,
  clipContext: { bbox: Bbox; simplified: ClipPolygon },
): Feature | null {
  const geometry = feature.geometry;
  const featureBbox = bboxOfPolygonOrMultiPolygon(geometry);

  if (bboxDisjoint(featureBbox, clipContext.bbox)) {
    return null;
  }

  const cornersInside = countBboxCornersInside(
    featureBbox,
    clipContext.simplified,
  );
  if (cornersInside === 4) {
    return feature;
  }

  if (
    cornersInside === 0 &&
    !booleanPointInPolygon(centroid(feature), clipContext.simplified)
  ) {
    return null;
  }

  const clipped = intersect(
    featureCollection([feature, clipContext.simplified]),
  );
  if (!clipped) {
    return null;
  }

  return {
    ...feature,
    geometry: clipped.geometry as Polygon | MultiPolygon,
    properties: feature.properties as GeoJsonProperties,
  };
}

function clipFeature(
  feature: Feature,
  clipContext: { bbox: Bbox; simplified: ClipPolygon },
): Feature | null {
  const geometry = feature.geometry;
  if (!geometry) {
    return null;
  }

  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    return clipPolygonFeature(
      feature as Feature<Polygon | MultiPolygon>,
      clipContext,
    );
  }

  if (geometry.type === 'Point') {
    return booleanPointInPolygon(geometry as Point, clipContext.simplified)
      ? feature
      : null;
  }

  if (geometry.type === 'MultiPoint') {
    const inside = geometry.coordinates.filter(coord =>
      booleanPointInPolygon(coord, clipContext.simplified),
    );
    if (inside.length === 0) {
      return null;
    }
    return {
      ...feature,
      geometry: { type: 'MultiPoint', coordinates: inside },
    };
  }

  // Lines and other geometries are left untouched.
  return feature;
}

export function clipFeatureCollectionToPolygon<
  T extends FeatureCollection = FeatureCollection,
>(fc: T, clipPolygon: ClipPolygon | null | undefined, clipId: string): T {
  if (!clipPolygon || !fc?.features?.length) {
    return fc;
  }

  const byClipId = memo.get(fc) ?? new Map<string, FeatureCollection>();
  const cached = byClipId.get(clipId);
  if (cached) {
    return cached as T;
  }

  const clipContext = getClipContext(clipPolygon, clipId);
  const clippedFeatures = fc.features
    .map(feature => clipFeature(feature, clipContext))
    .filter((f): f is Feature => f !== null);

  const result = { ...fc, features: clippedFeatures } as T;

  byClipId.set(clipId, result);
  memo.set(fc, byClipId);

  return result;
}

/** @internal Test helper — clear cached simplified clip polygons. */
export function clearClipVectorDataCacheForTests(): void {
  clipContextCache.clear();
}
