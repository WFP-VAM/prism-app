import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { Feature, MultiPolygon, point } from '@turf/helpers';
import { buffer } from 'd3-fetch';
import * as GeoTIFF from 'geotiff';
import { Map as MapBoxMap } from 'mapbox-gl';
import { createGetMapUrl } from 'prism-common';
import { Dispatch } from 'redux';
import { RASTER_API_URL } from 'utils/constants';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { LocalError } from 'utils/error-utils';
import { addNotification } from 'context/notificationStateSlice';

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
  return createGetMapUrl({
    base: `${baseUrl}/wms`,
    bboxSrs: 3857,
    exceptions: 'application/vnd.ogc.se_inimage',
    imageSrs: 3857,
    layerIds: [layerName],
    srs: 'EPSG:3857',
    version: '1.1.1',
    ...override,
  });
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

export async function getDownloadGeotiffURL(
  collection: string,
  band: string | undefined,
  boundingBox: Extent | undefined,
  date: string | undefined,
  dispatch: Dispatch,
) {
  if (!boundingBox) {
    throw new LocalError(
      `Missing bounding box: ${collection} Geotiff couldn't be downloaded`,
    );
  }
  const body = {
    collection,
    long_min: boundingBox[0],
    lat_min: boundingBox[1],
    long_max: boundingBox[2],
    lat_max: boundingBox[3],
    date,
    band,
  };
  const response = await fetchWithTimeout(
    RASTER_API_URL,
    dispatch,
    {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // body data type must match "Content-Type" header
      body: JSON.stringify(body),
    },
    `Request failed for creating Geotiff at ${RASTER_API_URL}`,
  );
  const responseJson = await response.json();

  return responseJson.download_url;
}

export async function downloadGeotiff(
  collection: string,
  band: string | undefined,
  boundingBox: Extent | undefined,
  date: string,
  dispatch: Dispatch,
  callback: () => void,
) {
  try {
    const downloadUrl = await getDownloadGeotiffURL(
      collection,
      band,
      boundingBox,
      date,
      dispatch,
    );
    const link = document.createElement('a');
    link.setAttribute('href', downloadUrl);
    link.click();
  } catch (error) {
    if (error instanceof LocalError) {
      console.error(error);
      dispatch(
        addNotification({
          message: error.message,
          type: 'warning',
        }),
      );
    }
  } finally {
    callback();
  }
}
