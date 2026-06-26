/**
 * PMTiles Protocol Handler for MapLibre
 *
 * This module sets up and manages the PMTiles protocol for efficient vector tile loading in MapLibre.
 * PMTiles is a single-file format for hosting vector tiles that enables efficient
 * loading and caching of map data.
 *
 * Key features:
 * - Registers a custom 'pmtiles://' protocol with MapLibre
 * - Maintains a singleton protocol instance to handle all PMTiles requests
 * - Caches PMTiles instances to prevent redundant loading
 * - Supports range requests for efficient tile loading
 * - Optional per-URL vector tile clipping to a deployment country polygon
 *
 * Usage:
 * 1. Initialize the protocol when the app starts:
 *    initPmtilesProtocol();
 *
 * 2. Use PMTiles in your map source:
 *    <Source type="vector" url="pmtiles://example.com/boundaries.pmtiles">
 *
 */

import MapLibreGL from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';
import {
  clipMvtTileToPolygon,
  type ClipPolygon,
} from 'utils/clipPmtilesVectorTile';

// Create a singleton instance of the protocol
const protocol = new Protocol();

// Map to store PMTiles instances
const pmtilesInstances = new Map<string, PMTiles>();

const pmtilesClipByUrl = new Map<string, ClipPolygon>();

let protocolRefCount = 0;

const TILE_URL_RE = /pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/;

function runClippedTile(
  params: { url: string },
  callback: (
    err?: Error | null,
    data?: unknown,
    cacheControl?: string,
    expires?: string,
  ) => void,
) {
  protocol.tile(params, (err, data, cacheControl, expires) => {
    if (err || !data) {
      callback(err ?? null, data, cacheControl, expires);
      return;
    }

    const match = params.url.match(TILE_URL_RE);
    if (!match) {
      callback(err ?? null, data, cacheControl, expires);
      return;
    }

    const pmtilesUrl = match[1];
    const clipPolygon = pmtilesClipByUrl.get(pmtilesUrl);
    if (!clipPolygon) {
      callback(err ?? null, data, cacheControl, expires);
      return;
    }

    try {
      const z = Number(match[2]);
      const x = Number(match[3]);
      const y = Number(match[4]);
      const tileBytes =
        data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      const clipped = clipMvtTileToPolygon(tileBytes, z, x, y, clipPolygon);
      callback(undefined, clipped, cacheControl, expires);
    } catch (clipError) {
      callback(clipError as Error);
    }
  });
}

export function setPmtilesClipPolygon(
  pmtilesUrl: string,
  clipPolygon: ClipPolygon | null,
) {
  if (clipPolygon) {
    pmtilesClipByUrl.set(pmtilesUrl, clipPolygon);
  } else {
    pmtilesClipByUrl.delete(pmtilesUrl);
  }
}

export const initPmtilesProtocol = () => {
  if (protocolRefCount === 0) {
    MapLibreGL.addProtocol('pmtiles', runClippedTile);
  }
  protocolRefCount += 1;
  return () => {
    protocolRefCount -= 1;
    if (protocolRefCount === 0) {
      MapLibreGL.removeProtocol('pmtiles');
    }
  };
};

export const getPmtilesInstance = (url: string) => {
  const instance = pmtilesInstances.get(url) ?? new PMTiles(url);
  if (!pmtilesInstances.has(url)) {
    protocol.add(instance);
    pmtilesInstances.set(url, instance);
  }
  return instance;
};
