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

import { addProtocol, removeProtocol } from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';
import {
  clipMvtTileToPolygon,
  type ClipPolygon,
} from 'utils/clipPmtilesVectorTile';

// Create a singleton instance of the protocol
const protocol = new Protocol();

// Map to store PMTiles instances
const pmtilesInstances = new Map<string, PMTiles>();

// Clip polygons are global per PMTiles URL, but several map instances (main
// map, export, dashboard) can mount the same URL. Ref-count so one unmount
// does not disable clipping for the others.
const pmtilesClipByUrl = new Map<
  string,
  { polygon: ClipPolygon; refCount: number }
>();

let protocolRefCount = 0;

const TILE_URL_RE = /pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/;

/**
 * MapLibre v5+ addProtocol expects a Promise-returning loader with AbortController.
 * Wrapping protocol.tile via the old v3 callback API silently drops tiles.
 */
async function runClippedTile(
  params: { url: string },
  abortController: AbortController,
) {
  const result = await protocol.tile(params, abortController);
  if (!result?.data) {
    return result;
  }

  const match = params.url.match(TILE_URL_RE);
  if (!match) {
    return result;
  }

  const pmtilesUrl = match[1];
  const clipPolygon = pmtilesClipByUrl.get(pmtilesUrl)?.polygon;
  if (!clipPolygon) {
    return result;
  }

  const z = Number(match[2]);
  const x = Number(match[3]);
  const y = Number(match[4]);
  const tileBytes =
    result.data instanceof Uint8Array
      ? result.data
      : new Uint8Array(result.data as ArrayBuffer);
  const clipped = clipMvtTileToPolygon(tileBytes, z, x, y, clipPolygon);
  return {
    data: clipped,
    cacheControl: result.cacheControl,
    expires: result.expires,
  };
}

/**
 * Clip tiles from `pmtilesUrl` to `clipPolygon` until the returned release
 * function is called. The clip is removed only after the last consumer releases.
 */
export function registerPmtilesClipPolygon(
  pmtilesUrl: string,
  clipPolygon: ClipPolygon,
): () => void {
  const entry = pmtilesClipByUrl.get(pmtilesUrl);
  pmtilesClipByUrl.set(pmtilesUrl, {
    polygon: clipPolygon,
    refCount: (entry?.refCount ?? 0) + 1,
  });

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    const current = pmtilesClipByUrl.get(pmtilesUrl);
    if (!current) {
      return;
    }
    if (current.refCount <= 1) {
      pmtilesClipByUrl.delete(pmtilesUrl);
    } else {
      pmtilesClipByUrl.set(pmtilesUrl, {
        ...current,
        refCount: current.refCount - 1,
      });
    }
  };
}

export const initPmtilesProtocol = () => {
  if (protocolRefCount === 0) {
    addProtocol('pmtiles', runClippedTile);
  }
  protocolRefCount += 1;
  return () => {
    protocolRefCount -= 1;
    if (protocolRefCount === 0) {
      removeProtocol('pmtiles');
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
