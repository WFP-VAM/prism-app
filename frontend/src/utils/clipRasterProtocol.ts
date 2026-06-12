/**
 * Source-level raster clipping for MapLibre.
 *
 * Registers a custom `clip://` protocol that intercepts raster tile requests,
 * fetches the real tile, and masks it to an admin-area polygon ONCE per tile.
 * MapLibre then caches the masked PNG, so panning/zooming/rotating is free and
 * there is no per-frame clip-path recomputation.
 *
 * Tile URL shape: `clip://<clipId>/<realTileUrl-with-bbox>`
 *   - <clipId> is a stable hash of the polygon (so changing the selection
 *     produces a new URL and busts MapLibre's tile cache).
 *   - <realTileUrl> still contains the `&bbox={bbox-epsg-3857}` placeholder so
 *     MapLibre substitutes the tile bbox before the handler runs.
 */
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import maplibregl from 'maplibre-gl';
import { stringHash } from 'utils/string-utils';

export type Bbox3857 = [number, number, number, number];

/** EPSG:3857 ring(s): exterior + holes for one polygon. */
type Ring3857 = Position[];

interface RegisteredClip {
  /** EPSG:3857 rings (exterior + interior) for every polygon in the geometry. */
  rings3857: Ring3857[];
  /** Original lng/lat geometry, kept for tile classification with turf. */
  feature: Feature<Polygon | MultiPolygon>;
}

const CLIP_SCHEME = 'clip';
const CLIP_PREFIX = `${CLIP_SCHEME}://`;
const EARTH_RADIUS = 6378137;

const clipRegistry = new Map<string, RegisteredClip>();

let protocolRegistered = false;

/**
 * When `window.__CLIP_DEBUG` is set, masked-out pixels are tinted red instead
 * of transparent, per-tile timing is logged, and a debug outline of the clip
 * polygon is drawn on the export map.
 */
export function isClipDebugEnabled(): boolean {
  return Boolean((globalThis as any).__CLIP_DEBUG);
}

let onClipError: ((error: Error, url: string) => void) | null = null;

/** Surface fetch/CORS failures (wired by MapExportLayout to a notification). */
export function setClipErrorHandler(
  handler: ((error: Error, url: string) => void) | null,
): void {
  onClipError = handler;
}

// --- Pure geometry helpers (exported for unit testing) --------------------

export function lngLatTo3857([lng, lat]: Position): [number, number] {
  const x = (EARTH_RADIUS * (lng * Math.PI)) / 180;
  const clampedLat = Math.max(Math.min(lat, 89.99999), -89.99999);
  const y =
    EARTH_RADIUS *
    Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360));
  return [x, y];
}

export function meters3857ToLngLat([x, y]: Position): [number, number] {
  const lng = (x / EARTH_RADIUS) * (180 / Math.PI);
  const lat =
    (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI);
  return [lng, lat];
}

/** Extract an EPSG:3857 bbox from a `bbox=` query parameter (WMS GetMap). */
export function parseBboxParam(url: string): Bbox3857 | null {
  const match = url.match(/[?&]bbox=([^&]+)/i);
  if (!match) {
    return null;
  }
  const parts = decodeURIComponent(match[1])
    .split(',')
    .map(Number)
    .filter(n => Number.isFinite(n));
  if (parts.length !== 4) {
    return null;
  }
  return parts as Bbox3857;
}

const MERCATOR_EXTENT = Math.PI * EARTH_RADIUS; // 20037508.34...

/** EPSG:3857 bbox of an XYZ tile (slippy map / TMS-XYZ scheme). */
export function tileXYZToBbox3857(z: number, x: number, y: number): Bbox3857 {
  const tilesPerSide = 2 ** z;
  const span = (2 * MERCATOR_EXTENT) / tilesPerSide;
  const minX = -MERCATOR_EXTENT + x * span;
  const maxX = -MERCATOR_EXTENT + (x + 1) * span;
  const maxY = MERCATOR_EXTENT - y * span;
  const minY = MERCATOR_EXTENT - (y + 1) * span;
  return [minX, minY, maxX, maxY];
}

/** EPSG:3857 bbox from the trailing `/{z}/{x}/{y}.ext` of an XYZ tile URL. */
export function parseXYZBbox(url: string): Bbox3857 | null {
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)(?:\.\w+)?(?:[?#].*)?$/);
  if (!match) {
    return null;
  }
  const [, z, x, y] = match.map(Number);
  return tileXYZToBbox3857(z, x, y);
}

/** Resolve a tile's EPSG:3857 bbox from either a WMS bbox param or XYZ path. */
export function resolveTileBbox(url: string): Bbox3857 | null {
  return parseBboxParam(url) ?? parseXYZBbox(url);
}

function ringsFromGeometry(geometry: Polygon | MultiPolygon): Position[][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }
  return geometry.coordinates.flat();
}

export function geometryTo3857Rings(
  geometry: Polygon | MultiPolygon,
): Ring3857[] {
  return ringsFromGeometry(geometry).map(ring => ring.map(lngLatTo3857));
}

/**
 * Project EPSG:3857 rings into tile pixel space for a given tile bbox.
 * Web Mercator is linear within a tile, so this is an exact linear map.
 */
export function clipRingsToTilePixels(
  rings3857: Ring3857[],
  [minX, minY, maxX, maxY]: Bbox3857,
  width: number,
  height: number,
): Array<Array<[number, number]>> {
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  return rings3857.map(ring =>
    ring.map(([x, y]) => {
      const px = ((x - minX) / spanX) * width;
      const py = ((maxY - y) / spanY) * height;
      return [px, py] as [number, number];
    }),
  );
}

export type TileClipClass = 'inside' | 'outside' | 'partial';

/**
 * Classify a tile against the clip polygon to decide how much work to do:
 *  - 'outside': tile bbox does not intersect the polygon bbox -> transparent.
 *  - 'inside':  all four tile corners are inside the polygon AND no polygon
 *               vertex lies within the tile -> no masking needed.
 *  - 'partial': everything else -> mask pixels.
 *
 * The 'inside' test is sound for simple polygons: for the boundary to enter and
 * leave a tile it must either have a vertex inside the tile or push a corner
 * outside the polygon, both of which are checked here.
 */
export function classifyTileAgainstClip(
  bbox3857: Bbox3857,
  feature: Feature<Polygon | MultiPolygon>,
): TileClipClass {
  const [minX, minY, maxX, maxY] = bbox3857;
  const sw = meters3857ToLngLat([minX, minY]);
  const ne = meters3857ToLngLat([maxX, maxY]);
  const [west, south] = sw;
  const [east, north] = ne;

  const polyBbox = lngLatBboxOfGeometry(feature.geometry);
  const disjoint =
    east < polyBbox[0] ||
    west > polyBbox[2] ||
    north < polyBbox[1] ||
    south > polyBbox[3];
  if (disjoint) {
    return 'outside';
  }

  const corners: Position[] = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
  ];
  const allCornersInside = corners.every(c =>
    booleanPointInPolygon(point(c), feature),
  );
  if (!allCornersInside) {
    return 'partial';
  }

  const anyVertexInTile = ringsFromGeometry(feature.geometry).some(ring =>
    ring.some(
      ([lng, lat]) =>
        lng >= west && lng <= east && lat >= south && lat <= north,
    ),
  );
  return anyVertexInTile ? 'partial' : 'inside';
}

function lngLatBboxOfGeometry(
  geometry: Polygon | MultiPolygon,
): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  ringsFromGeometry(geometry).forEach(ring =>
    ring.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }),
  );
  return [minLng, minLat, maxLng, maxLat];
}

// --- Registry + URL helpers ----------------------------------------------

export function registerClipPolygon(
  feature: Feature<Polygon | MultiPolygon>,
): string {
  const clipId = stringHash(JSON.stringify(feature.geometry.coordinates));
  if (!clipRegistry.has(clipId)) {
    clipRegistry.set(clipId, {
      rings3857: geometryTo3857Rings(feature.geometry),
      feature,
    });
  }
  return clipId;
}

export function buildClipTileUrl(realTileUrl: string, clipId: string): string {
  return `${CLIP_PREFIX}${clipId}/${realTileUrl}`;
}

export function parseClipTileUrl(url: string): {
  clipId: string;
  realUrl: string;
} | null {
  if (!url.startsWith(CLIP_PREFIX)) {
    return null;
  }
  const withoutScheme = url.slice(CLIP_PREFIX.length);
  const slashIdx = withoutScheme.indexOf('/');
  if (slashIdx === -1) {
    return null;
  }
  return {
    clipId: withoutScheme.slice(0, slashIdx),
    realUrl: withoutScheme.slice(slashIdx + 1),
  };
}

// --- Canvas masking -------------------------------------------------------

let transparentTilePromise: Promise<ArrayBuffer> | null = null;

function createCanvas(
  width: number,
  height: number,
): {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, ctx: canvas.getContext('2d')! };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}

async function canvasToArrayBuffer(
  canvas: OffscreenCanvas | HTMLCanvasElement,
): Promise<ArrayBuffer> {
  if ('convertToBlob' in canvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blob.arrayBuffer();
  }
  const blob: Blob = await new Promise((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      b => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      'image/png',
    ),
  );
  return blob.arrayBuffer();
}

function getTransparentTile(width = 256, height = 256): Promise<ArrayBuffer> {
  if (!transparentTilePromise) {
    const { canvas } = createCanvas(width, height);
    transparentTilePromise = canvasToArrayBuffer(canvas);
  }
  return transparentTilePromise;
}

async function maskTile(
  tileBytes: ArrayBuffer,
  bbox3857: Bbox3857,
  clip: RegisteredClip,
): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(new Blob([tileBytes]));
  const { width, height } = bitmap;
  const { canvas, ctx } = createCanvas(width, height);

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const pixelRings = clipRingsToTilePixels(
    clip.rings3857,
    bbox3857,
    width,
    height,
  );

  if (isClipDebugEnabled()) {
    // Paint the masked-out region red so it is visible during debugging.
    ctx.save();
    ctx.fillStyle = 'rgba(255,0,0,0.4)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    drawRingsPath(ctx, pixelRings);
    ctx.fill('evenodd');
    ctx.restore();
    return canvasToArrayBuffer(canvas);
  }

  ctx.globalCompositeOperation = 'destination-in';
  drawRingsPath(ctx, pixelRings);
  ctx.fill('evenodd');

  return canvasToArrayBuffer(canvas);
}

function drawRingsPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rings: Array<Array<[number, number]>>,
): void {
  ctx.beginPath();
  rings.forEach(ring => {
    ring.forEach(([x, y], i) => {
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
  });
}

// --- Protocol registration ------------------------------------------------

export function initClipRasterProtocol(): void {
  if (protocolRegistered) {
    return;
  }
  protocolRegistered = true;

  maplibregl.addProtocol(CLIP_SCHEME, ((params: any, callback: any) => {
    const aborted = { value: false };
    const parsed = parseClipTileUrl(params.url);

    if (!parsed) {
      callback(new Error(`Invalid clip URL: ${params.url}`));
      return { cancel: () => {} };
    }

    const { clipId, realUrl } = parsed;
    const clip = clipRegistry.get(clipId);
    const bbox3857 = resolveTileBbox(realUrl);

    if (!clip || !bbox3857) {
      // No clip context (or no bbox) -> behave like a normal raster fetch.
      fetchTile(realUrl, aborted, callback);
      return { cancel: () => (aborted.value = true) };
    }

    const tileClass = classifyTileAgainstClip(bbox3857, clip.feature);

    if (tileClass === 'outside') {
      getTransparentTile()
        .then(buf => !aborted.value && callback(null, buf, null, null))
        .catch(err => !aborted.value && callback(err));
      return { cancel: () => (aborted.value = true) };
    }

    const startMs = performance.now();
    (async () => {
      const response = await fetch(realUrl);
      if (!response.ok) {
        throw new Error(`Tile request failed (${response.status}): ${realUrl}`);
      }
      const tileBytes = await response.arrayBuffer();

      if (tileClass === 'inside') {
        return tileBytes;
      }

      const masked = await maskTile(tileBytes, bbox3857, clip);
      if (isClipDebugEnabled()) {
        // eslint-disable-next-line no-console
        console.info('[clip]', {
          clipId,
          bbox: bbox3857,
          classification: tileClass,
          maskMs: performance.now() - startMs,
        });
      }
      return masked;
    })()
      .then(buf => !aborted.value && callback(null, buf, null, null))
      .catch(err => {
        if (aborted.value) {
          return;
        }
        console.error('[clip] tile masking failed', err);
        onClipError?.(err as Error, realUrl);
        callback(err);
      });

    return { cancel: () => (aborted.value = true) };
  }) as any);
}

function fetchTile(
  realUrl: string,
  aborted: { value: boolean },
  callback: any,
): void {
  fetch(realUrl)
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Tile request failed (${response.status}): ${realUrl}`);
      }
      return response.arrayBuffer();
    })
    .then(buf => !aborted.value && callback(null, buf, null, null))
    .catch(err => {
      if (aborted.value) {
        return;
      }
      console.error('[clip] tile fetch failed', err);
      onClipError?.(err as Error, realUrl);
      callback(err);
    });
}

/** Test-only: reset module state between unit tests. */
export function __resetClipRegistryForTests(): void {
  clipRegistry.clear();
  protocolRegistered = false;
  transparentTilePromise = null;
  onClipError = null;
}
