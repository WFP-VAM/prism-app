import type { GeoTIFF, Overview } from '@developmentseed/geotiff';

export {
  FTW_CONFIDENCE_MAX,
  ftwConfidenceMaskMin,
  ftwConfidenceRawThreshold,
} from 'utils/ftwConfidence';

/** Pick the mask IFD whose pixel size matches the density tile pyramid level. */
export function resolveMaskImage(
  maskGeotiff: GeoTIFF,
  densityImage: GeoTIFF | Overview,
): GeoTIFF | Overview {
  if (densityImage.width === maskGeotiff.width) {
    return maskGeotiff;
  }
  const match = maskGeotiff.overviews.find(
    overview => overview.width === densityImage.width,
  );
  if (!match) {
    throw new Error(
      `No mask overview matching density width ${densityImage.width}`,
    );
  }
  return match;
}

/**
 * Zero density samples where the confidence mask is nodata (255) or below
 * maskMin. Mutates `raw` in place. Same-grid tiles only.
 */
export function applyConfidenceMask(
  raw: { [i: number]: number; length: number },
  mask: ArrayLike<number>,
  maskMin: number,
  nodataValue: number,
): void {
  const n = Math.min(raw.length, mask.length);
  for (let i = 0; i < n; i += 1) {
    const m = mask[i]!;
    if (m === 255 || m < maskMin) {
      raw[i] = nodataValue;
    }
  }
}
