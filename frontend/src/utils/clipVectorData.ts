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
import { featureCollection, point } from '@turf/helpers';
import intersect from '@turf/intersect';
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

type Bbox = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

function updateBboxFromPosition(bbox: Bbox, [lng, lat]: Position): void {
  // Guard: some datasets can have junk coordinates; treat as "needs clip".
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

function clipFeature(
  feature: Feature,
  clipPolygon: ClipPolygon,
): Feature | null {
  const geometry = feature.geometry;
  if (!geometry) {
    return null;
  }

  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    // Fast-path: avoid expensive turf intersect when feature is fully inside clip.
    // This is common for admin polygons well within the country boundary, and it
    // prevents huge main-thread stalls (e.g. RBD admin2 layers).
    const clipBbox = bboxOfPolygonOrMultiPolygon(clipPolygon.geometry);
    const featureBbox = bboxOfPolygonOrMultiPolygon(
      geometry as Polygon | MultiPolygon,
    );
    if (bboxDisjoint(featureBbox, clipBbox)) {
      return null;
    }
    const allBboxCornersInside = bboxCorners(featureBbox).every(corner =>
      booleanPointInPolygon(point(corner), clipPolygon),
    );
    if (allBboxCornersInside) {
      return feature;
    }

    const clipped = intersect(
      featureCollection([
        feature as Feature<Polygon | MultiPolygon>,
        clipPolygon,
      ]),
    );
    if (!clipped) {
      return null;
    }
    return {
      ...feature,
      geometry: clipped.geometry,
      properties: feature.properties as GeoJsonProperties,
    };
  }

  if (geometry.type === 'Point') {
    return booleanPointInPolygon(geometry as Point, clipPolygon)
      ? feature
      : null;
  }

  if (geometry.type === 'MultiPoint') {
    const inside = geometry.coordinates.filter(coord =>
      booleanPointInPolygon(coord, clipPolygon),
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

  const clippedFeatures = fc.features
    .map(feature => clipFeature(feature, clipPolygon))
    .filter((f): f is Feature => f !== null);

  const result = { ...fc, features: clippedFeatures } as T;

  byClipId.set(clipId, result);
  memo.set(fc, byClipId);

  return result;
}
