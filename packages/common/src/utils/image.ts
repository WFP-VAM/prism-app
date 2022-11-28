import { checkExtent } from "./bbox";
import type { BBOX } from "../types";

export function scaleImage(
  extent: BBOX,
  {
    checkExtent: doCheckExtent = true,
    resolution = 256,
    maxPixels = 5096,
  }: {
    checkExtent?: boolean;
    resolution?: number;
    maxPixels?: number;
  } = {
    checkExtent: true,
    resolution: 256,
    maxPixels: 5096,
  }
) {
  if (doCheckExtent) {
    checkExtent(extent);
  }

  const [minX, minY, maxX, maxY] = extent;

  // Get our image width & height at either the desired resolution or a down-sampled resolution if the resulting
  // dimensions would exceed our `maxPixels` in height or width
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  const maxDim = Math.min(maxPixels, xRange * resolution, yRange * resolution);
  const scale = maxDim / Math.max(xRange, yRange);

  const width = Math.ceil(xRange * scale);
  const height = Math.ceil(yRange * scale);

  return { width, height };
}
