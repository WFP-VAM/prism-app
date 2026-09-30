import { Map as MaplibreMap, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let initialized = false;

/**
 * MapLibre v6 moved the camera out of Map (Map no longer extends Camera), so
 * `map.transform` is gone. @deck.gl/mapbox (<=9.4) still reads
 * `map.transform.height` / `.elevation` when rendering interleaved layers, and
 * crashes every frame without it. Re-expose the camera's transform until
 * deck.gl supports v6.
 */
function patchMapTransformForDeckGL(): void {
  const proto = MaplibreMap.prototype as unknown as Record<string, unknown>;
  if ('transform' in proto) {
    return;
  }
  Object.defineProperty(proto, 'transform', {
    configurable: true,
    get(this: { _camera?: { transform: unknown } }) {
      return this._camera?.transform;
    },
  });
}

/** Vite cannot resolve the v6 ESM worker from import.meta.url. Call once per app. */
export function initMaplibre(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  setWorkerUrl(workerUrl);
  patchMapTransformForDeckGL();
}
