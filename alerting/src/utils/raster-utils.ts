import { formatUrl } from './server-utils';

// GDAL style extent: xmin ymin xmax ymax
export type Extent = [number, number, number, number];

export function getWCSUrl(
  baseUrl: string,
  layerName: string,
  date: string | undefined,
  xRange: readonly [number, number],
  yRange: readonly [number, number],
  width: number,
  height?: number,
) {
  const params = {
    service: 'WCS',
    request: 'GetCoverage',
    version: '1.0.0',
    coverage: layerName,
    crs: 'EPSG:4326',
    bbox: [xRange[0], yRange[0], xRange[1], yRange[1]]
      .map((v) => v.toFixed(1))
      .join(','),
    width: width.toString(),
    height: (height || width).toString(),
    format: 'GeoTIFF',
    ...(date && {
      time: date,
    }),
  };
  return formatUrl(baseUrl, params);
}

export function WCSRequestUrl(
  baseUrl: string,
  layerName: string,
  date: string | undefined,
  extent: Extent,
  resolution = 256,
  maxPixels = 5096,
) {
  const [minX, minY, maxX, maxY] = extent;
  if (minX > maxX || minY > maxY) {
    throw new Error(
      `Could not generate WCS request for ${baseUrl}/${layerName}: the extent ${extent} seems malformed or else may contain "wrapping" which is not implemented in the function 'WCSRequestUrl'`,
    );
  }

  // Get our image width & height at either the desired resolution or a down-sampled resolution if the resulting
  // dimensions would exceed our `maxPixels` in height or width
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  const maxDim = Math.min(maxPixels, xRange * resolution, yRange * resolution);
  const scale = maxDim / Math.max(xRange, yRange);

  const width = Math.ceil(xRange * scale);
  const height = Math.ceil(yRange * scale);

  return getWCSUrl(
    baseUrl,
    layerName,
    date,
    [minX, maxX],
    [minY, maxY],
    width,
    height,
  );
}
