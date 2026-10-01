import type { FilterSpecification } from 'maplibre-gl';

/**
 * FTW Explorer confidence helpers.
 * UI threshold is percent 0–100 (default 70); data is raw float in
 * [0, FTW_CONFIDENCE_MAX]. Matches fieldsoftheworld/ftw-inference-app.
 */
export const FTW_CONFIDENCE_MAX = 0.578178;

/** GeoTIFF `max` for the uint8 web-display confidence COG (nodata 255). */
const FTW_CONFIDENCE_UINT8_MAX = 200;

/** PMTiles property for the mean confidence metric. */
const FTW_CONFIDENCE_PROPERTY = 'confidence_mean';

/** Convert UI percent (0–100) to raw confidence. */
export function ftwConfidenceRawThreshold(percent: number): number {
  return (percent / 100) * FTW_CONFIDENCE_MAX;
}

/**
 * Uint8 cutoff for the web-display confidence mask COG.
 * Band values encode raw confidence × 200; keep pixels with mask >= this.
 */
export function ftwConfidenceMaskMin(percent: number): number {
  return ftwConfidenceRawThreshold(percent) * FTW_CONFIDENCE_UINT8_MAX;
}

/** MapLibre filter keeping features above the UI percent threshold. */
export function ftwConfidenceFilter(percent: number): FilterSpecification {
  // tippecanoe stores confidence_* as strings; MapLibre won't coerce for `>`.
  return [
    '>',
    ['to-number', ['get', FTW_CONFIDENCE_PROPERTY]],
    ftwConfidenceRawThreshold(percent),
  ];
}
