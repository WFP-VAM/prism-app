import { formatUrl } from '../../../packages/common';

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
