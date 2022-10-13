import { checkExtent } from './bbox';
import type { BBOX } from '../types';

export function scaleImage(
  extent: BBOX,
  {
    check_extent = true,
    resolution = 256,
    max_pixels = 5096,
  }: {
    check_extent?: boolean;
    resolution?: number;
    max_pixels?: number;
  } = {
    check_extent: true,
    resolution: 256,
    max_pixels: 5096,
  },
) {
  if (check_extent) {
    checkExtent(extent);
  }

  const [minX, minY, maxX, maxY] = extent;

  // Get our image width & height at either the desired resolution or a down-sampled resolution if the resulting
  // dimensions would exceed our `maxPixels` in height or width
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  const maxDim = Math.min(max_pixels, xRange * resolution, yRange * resolution);
  const scale = maxDim / Math.max(xRange, yRange);

  const width = Math.ceil(xRange * scale);
  const height = Math.ceil(yRange * scale);

  return { width, height };
}
