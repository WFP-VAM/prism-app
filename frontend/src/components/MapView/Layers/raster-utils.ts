import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { Feature, MultiPolygon, point } from '@turf/helpers';
import { buffer } from 'd3-fetch';
import * as GeoTIFF from 'geotiff';
import { Map as MapBoxMap } from 'mapbox-gl';
import { createGetCoverageUrl, createGetMapUrl } from 'prism-common';
import { Dispatch } from 'redux';
import { addNotification } from '../../../context/notificationStateSlice';
import { BACKEND_URL } from '../../../utils/constants';

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

function numberOfTiles(
  min: number,
  max: number,
  resolution: number,
  pixelsPerTile: number,
) {
  const range = max - min;
  return Math.ceil((range * resolution) / pixelsPerTile);
}

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

/**
 * Generates an array of WCS URLs to request GeoTiff tiles based on the given extent and pixel resolution.
 *
 * @param baseUrl Base resource URL
 * @param layerName ID of coverage/layer to get on the server
 * @param date
 * @param extent Full extent of the area to get coverage images for
 * @param resolution pixels per degree lat/long
 * @param pixelsPerTile
 */
export function WCSTileUrls(
  baseUrl: string,
  layerName: string,
  date: string,
  extent: Extent,
  resolution = 256,
  pixelsPerTile = 512,
): string[] {
  // Set up tile grid in x/y.
  const [minX, minY, maxX, maxY] = extent;
  if (minX > maxX || minY > maxY) {
    throw new Error(
      `Could not generate tile grid for ${baseUrl}/${layerName}: the extent ${extent} seems malformed or else may contain "wrapping" which is not implemented in the function 'WCSTileUrls'`,
    );
  }

  const degPerTile = pixelsPerTile / resolution;

  const xTiles = numberOfTiles(minX, maxX, resolution, pixelsPerTile);
  const yTiles = numberOfTiles(minY, maxY, resolution, pixelsPerTile);

  return [...Array(xTiles)]
    .map((_1, xIdx) => {
      const x = [
        xIdx * degPerTile + minX,
        (xIdx + 1) * degPerTile + minX,
      ] as const;
      return [...Array(yTiles)].map((_2, yIdx) => {
        const y = [
          yIdx * degPerTile + minY,
          (yIdx + 1) * degPerTile + minY,
        ] as const;
        return createGetCoverageUrl({
          bbox: [x[0], y[0], x[1], y[1]],
          date,
          height: pixelsPerTile,
          layerId: layerName,
          width: pixelsPerTile,
          url: baseUrl,
          version: '1.0.0',
        });
      });
    })
    .flat();
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

export async function downloadGeotiff(
  collection: string,
  boundingBox: Extent | undefined,
  date: string,
  dispatch: Dispatch,
  callback: () => void,
) {
  if (!boundingBox) {
    dispatch(
      addNotification({
        message: `Missing bounding box: ${collection} Geotiff couldn't be downloaded`,
        type: 'warning',
      }),
    );
  } else {
    const body = {
      collection,
      lat_min: boundingBox[0],
      long_min: boundingBox[1],
      lat_max: boundingBox[2],
      long_max: boundingBox[3],
      date,
    };
    const response = await fetch(`${BACKEND_URL}/raster_geotiff`, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // body data type must match "Content-Type" header
      body: JSON.stringify(body),
    });
    if (response.status !== 200) {
      dispatch(
        addNotification({
          message: `${collection} Geotiff couldn't be generated`,
          type: 'warning',
        }),
      );
    } else {
      const responseJson = await response.json();

      const link = document.createElement('a');
      link.setAttribute('href', responseJson.download_url);
      link.click();
    }
    callback();
  }
}
