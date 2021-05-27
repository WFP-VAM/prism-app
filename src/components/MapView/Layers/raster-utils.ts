import { Feature, MultiPolygon, point } from '@turf/helpers';
import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import * as GeoTIFF from 'geotiff';
import { buffer } from 'd3-fetch';
import { Map as MapBoxMap } from 'mapbox-gl';
import { formatUrl } from '../../../utils/server-utils';

export type TransformMatrix = [number, number, number, number, number, number];
export type TypedArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

export interface Rasters extends Array<TypedArray> {
  height: number;
  width: number;
}

export type GeoJsonBoundary = Feature<MultiPolygon>;

// GDAL style extent: xmin ymin xmax ymax
export type Extent = [number, number, number, number];

// Placeholder for Geotiff image (since library doesn't contain types)
export type GeoTiffImage = {
  getBoundingBox: () => Extent;
  getBytesPerPixel: () => number;
  getFileDirectory: () => { ModelPixelScale: number[] };
  getHeight: () => number;
  getOrigin: () => [number, number, number];
  getResolution: () => [number, number, number];
  getSamplesPerPixel: () => number;
  getTiePoints: () => {
    i: number;
    j: number;
    k: number;
    x: number;
    y: number;
    z: number;
  }[];
  getTileHeight: () => number;
  getTileWidth: () => number;
  getWidth: () => number;
  pixelIsArea: () => boolean;
  readRasters: (options?: {
    window?: Extent;
    samples?: number[];
    interleave?: boolean;
    pool?: number;
    width?: number;
    height?: number;
    resampleMethod?: string;
    fillValue?: number | number[];
  }) => Promise<Rasters>;
};

export function getWMSUrl(
  baseUrl: string,
  layerName: string,
  override: { [key: string]: string } = {},
) {
  const params = {
    version: '1.1.1',
    request: 'GetMap',
    format: 'image/png',
    transparent: true,
    exceptions: 'application/vnd.ogc.se_inimage',
    bboxsr: 3857,
    imagesr: 3857,
    width: 256,
    height: 256,
    srs: 'EPSG:3857',
    ...override,
    layers: layerName,
  };

  return formatUrl(`${baseUrl}/wms`, params);
}
export function getWCSUrl(
  baseUrl: string,
  layerName: string,
  subsets: string[],
) {
  const params = {
    service: 'WCS',
    request: 'GetCoverage',
    version: '2.0.0',
    coverageId: layerName,
  };

  const formattedUrl = formatUrl(baseUrl, params);

  const formattedSubsets = subsets.map(s => `subset=${s}`).join('&');

  const formattedUrlWithSubsets = `${formattedUrl}&${formattedSubsets}`;

  return formattedUrlWithSubsets;
}

export function WCSRequestUrl(
  baseUrl: string,
  layerName: string,
  date: string | undefined,
  extent: Extent,
) {
  const [minX, minY, maxX, maxY] = extent;
  if (minX > maxX || minY > maxY) {
    throw new Error(
      `Could not generate WCS request for ${baseUrl}/${layerName}: the extent ${extent} seems malformed or else may contain "wrapping" which is not implemented in the function 'WCSRequestUrl'`,
    );
  }

  // Subsets are used as spatial and temporal filters.
  // For mote info: https://docs.geoserver.geo-solutions.it/edu/en/wcs/get.html
  const subsets: string[] = [
    `longitude(${minX}, ${maxX})`,
    `latitude(${minY}, ${maxY})`,
  ];

  return getWCSUrl(
    baseUrl,
    layerName,
    date ? [...subsets, `time("${date}")`] : subsets,
  );
}

export function getTransform(geoTiffImage: GeoTiffImage): TransformMatrix {
  const tiepoint = geoTiffImage.getTiePoints()[0];
  const pixelScale = geoTiffImage.getFileDirectory().ModelPixelScale;
  return [
    tiepoint.x,
    pixelScale[0],
    0,
    tiepoint.y,
    0,
    -1 * pixelScale[1],
  ] as TransformMatrix;
}

export async function loadGeoTiff(path: string) {
  const raw = await buffer(path);
  const tiff = await GeoTIFF.fromArrayBuffer(raw);
  const image = (await tiff.getImage()) as GeoTiffImage;
  const rasters = await image.readRasters();
  const transform = getTransform(image);
  return { image, rasters, transform };
}

export function indexToGeoCoords(
  idx: number,
  width: number,
  transform: TransformMatrix,
) {
  const col = idx % width;
  const row = Math.floor(idx / width);
  return {
    x: transform[0] + col * transform[1] + row * transform[2],
    y: transform[3] + col * transform[4] + row * transform[5],
  };
}

export function geoCoordsToRowCol(
  x: number,
  y: number,
  transform: TransformMatrix,
) {
  if (transform[2] + transform[4] !== 0) {
    throw new Error(
      'Transform contains rotations, this calculation is not implemented in function geoCoordsToRowCol.',
    );
  }
  return {
    col: Math.floor((x - transform[0]) / transform[1] + 0.5),
    row: Math.floor((y - transform[3]) / transform[5] + 0.5),
  };
}

export function featureIntersectsImage(
  feature: GeoJsonBoundary,
  image: GeoTiffImage,
) {
  const featureExtent = bbox(feature);
  const imageExtent = image.getBoundingBox();

  const xWithinImage = (x: number) =>
    x >= imageExtent[0] && x <= imageExtent[2];
  const yWithinImage = (y: number) =>
    y >= imageExtent[1] && y <= imageExtent[3];

  return (
    (xWithinImage(featureExtent[0]) || xWithinImage(featureExtent[2])) &&
    (yWithinImage(featureExtent[1]) || yWithinImage(featureExtent[2]))
  );
}

export function filterPointsByFeature(
  rasterPoints: { x: number; y: number; value: number }[],
  feature: GeoJsonBoundary,
) {
  const [minX, minY, maxX, maxY] = bbox(feature);
  return rasterPoints.filter(({ x, y }) => {
    return (
      x > minX &&
      x < maxX &&
      y > minY &&
      y < maxY &&
      booleanPointInPolygon(point([x, y]), feature)
    );
  });
}

export function pixelsInFeature(
  feature: GeoJsonBoundary,
  pixels: TypedArray,
  width: number,
  transform: TransformMatrix,
): number[] {
  const [minX, minY, maxX, maxY] = bbox(feature);

  const { row: startRow, col: startCol } = geoCoordsToRowCol(
    minX,
    maxY,
    transform,
  );
  const { row: endRow, col: endCol } = geoCoordsToRowCol(maxX, minY, transform);

  // Loop through rows doing a row-wise slice of all the pixels contained within this feature's bounding box
  return [...new Array(endRow - startRow)].reduce((acc, _v, idx) => {
    const rowIdx = (startRow + idx) * width;
    const row = pixels.slice(startCol + rowIdx, endCol + rowIdx);
    return acc.concat(
      Array.from(
        row.filter((_pixel: any, innerIdx: number) => {
          const { x, y } = indexToGeoCoords(
            innerIdx + rowIdx + startCol,
            width,
            transform,
          );
          return booleanPointInPolygon(point([x, y]), feature);
        }),
      ),
    );
  }, [] as number[]);
}

export function getExtent(map?: MapBoxMap): Extent {
  // TODO - Use bbox on the admin boundaries instead.
  const bounds = map?.getBounds();

  const minX = bounds?.getWest();
  const maxX = bounds?.getEast();
  const minY = bounds?.getSouth();
  const maxY = bounds?.getNorth();

  return [minX, minY, maxX, maxY].map(val => val || 0) as Extent;
}
