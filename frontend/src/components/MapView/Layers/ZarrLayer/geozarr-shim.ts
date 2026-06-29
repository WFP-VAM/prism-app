import type { SpatialAttrs } from '@developmentseed/geozarr';
import { parseGeoZarrMetadata } from '@developmentseed/geozarr';

import { toFloat64Array } from './georef';

export type GeoZarrMetadataAttrs = SpatialAttrs & {
  'proj:code': string;
};

/** Derive a 6-parameter affine from 1-D lat/lon coordinate arrays. */
export function coordsToAffine(
  lats: Float64Array,
  lons: Float64Array,
): [number, number, number, number, number, number] {
  const dLon = lons.length > 1 ? lons[1]! - lons[0]! : 0.25;
  const dLat = lats.length > 1 ? lats[1]! - lats[0]! : -0.25;

  // Affine maps (col, row) -> (lon, lat): lon = a*col + c, lat = e*row + f
  return [dLon, 0, lons[0]!, 0, dLat, lats[0]!];
}

const Y_LABELS = new Set(['y', 'latitude', 'lat']);
const X_LABELS = new Set(['x', 'longitude', 'lon']);

/** Pick the [y, x] spatial dim names from the full ordered dim list. */
export function resolveSpatialDims(dims: string[]): [string, string] {
  const yDim =
    dims.find(d => Y_LABELS.has(d.toLowerCase())) ?? dims[dims.length - 2];
  const xDim =
    dims.find(d => X_LABELS.has(d.toLowerCase())) ?? dims[dims.length - 1];
  return [yDim!, xDim!];
}

/**
 * Synthesize GeoZarr group attrs for plain CF-style cubes that lack
 * spatial / geo-proj conventions. Passed to deck.gl-zarr via `metadata`.
 *
 * `spatial:dimensions` lists only the spatial (y, x) axes — deck.gl-zarr reads
 * the full ordered dim list from the zarr array itself and pins the remaining
 * non-spatial dims (e.g. init_time, lead_time, ensemble_member) via `selection`.
 */
export function buildGeoZarrMetadata(
  dims: string[],
  lats: Float64Array,
  lons: Float64Array,
): GeoZarrMetadataAttrs {
  const height = lats.length;
  const width = lons.length;

  const metadata: GeoZarrMetadataAttrs = {
    'spatial:dimensions': resolveSpatialDims(dims),
    'spatial:transform': coordsToAffine(lats, lons),
    'spatial:shape': [height, width],
    'spatial:registration': 'pixel',
    'proj:code': 'EPSG:4326',
  };

  parseGeoZarrMetadata(metadata);

  return metadata;
}

/** Normalize a zarrita coordinate read result to Float64Array. */
export function readCoordValues(result: unknown): Float64Array {
  return toFloat64Array(result);
}
