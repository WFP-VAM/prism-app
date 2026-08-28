import type { GeoTIFF, Overview } from '@developmentseed/geotiff';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import {
  type Bbox3857,
  classifyTileAgainstClip,
  clipRingsToTilePixels,
  geometryTo3857Rings,
  lngLatTo3857,
} from 'utils/clipRasterProtocol';

export type DeploymentClipFeature = Feature<Polygon | MultiPolygon>;

type GeorefImage = Pick<
  GeoTIFF | Overview,
  'tileWidth' | 'tileHeight' | 'xy' | 'crs'
>;

/** EPSG:3857 bbox of a GeoTIFF internal tile (handles 4326 → 3857). */
export function geotiffTileBbox3857(
  image: GeorefImage,
  tileX: number,
  tileY: number,
  width: number,
  height: number,
): Bbox3857 {
  const col0 = tileX * image.tileWidth;
  const row0 = tileY * image.tileHeight;
  const [x0, y0] = image.xy(row0, col0, 'ul');
  const [x1, y1] = image.xy(row0 + height - 1, col0 + width - 1, 'lr');

  let minX = Math.min(x0, x1);
  let maxX = Math.max(x0, x1);
  let minY = Math.min(y0, y1);
  let maxY = Math.max(y0, y1);

  if (image.crs === 4326) {
    const sw = lngLatTo3857([minX, minY]);
    const ne = lngLatTo3857([maxX, maxY]);
    minX = Math.min(sw[0], ne[0]);
    maxX = Math.max(sw[0], ne[0]);
    minY = Math.min(sw[1], ne[1]);
    maxY = Math.max(sw[1], ne[1]);
  }

  return [minX, minY, maxX, maxY];
}

function buildKeepMask(
  width: number,
  height: number,
  pixelRings: Array<Array<[number, number]>>,
): Uint8Array {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      pixelRings.forEach(ring => {
        ring.forEach(([x, y], i) => {
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
      });
      ctx.fill('evenodd');
      const { data } = ctx.getImageData(0, 0, width, height);
      const mask = new Uint8Array(width * height);
      for (let i = 0; i < mask.length; i += 1) {
        mask[i] = data[i * 4]! > 0 ? 1 : 0;
      }
      return mask;
    }
  }

  // Ceiling: O(pixels × vertices); fine for unit tests / rare fallbacks.
  const mask = new Uint8Array(width * height);
  const feature: DeploymentClipFeature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: pixelRings.map(ring => ring.map(([x, y]) => [x, y])),
    },
  };
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const i = row * width + col;
      mask[i] = booleanPointInPolygon(point([col + 0.5, row + 0.5]), feature)
        ? 1
        : 0;
    }
  }
  return mask;
}

/**
 * Zero samples outside the deployment clip polygon. Mutates `raw` in place.
 * Uses the same tile classification as MapLibre raster clipping.
 */
export function applyDeploymentClip(
  raw: { [i: number]: number; length: number },
  width: number,
  height: number,
  bbox3857: Bbox3857,
  clipFeature: DeploymentClipFeature,
  nodataValue: number,
): void {
  const classification = classifyTileAgainstClip(bbox3857, clipFeature);
  if (classification === 'inside') {
    return;
  }
  if (classification === 'outside') {
    for (let i = 0; i < raw.length; i += 1) {
      raw[i] = nodataValue;
    }
    return;
  }

  const pixelRings = clipRingsToTilePixels(
    geometryTo3857Rings(clipFeature.geometry),
    bbox3857,
    width,
    height,
  );
  const keep = buildKeepMask(width, height, pixelRings);
  const n = Math.min(raw.length, keep.length);
  for (let i = 0; i < n; i += 1) {
    if (!keep[i]) {
      raw[i] = nodataValue;
    }
  }
}
