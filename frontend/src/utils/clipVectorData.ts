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
import { featureCollection } from '@turf/helpers';
import intersect from '@turf/intersect';
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Point,
  Polygon,
} from 'geojson';

export type ClipPolygon = Feature<Polygon | MultiPolygon>;

const memo = new WeakMap<FeatureCollection, Map<string, FeatureCollection>>();

function clipFeature(
  feature: Feature,
  clipPolygon: ClipPolygon,
): Feature | null {
  const geometry = feature.geometry;
  if (!geometry) {
    return null;
  }

  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
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
