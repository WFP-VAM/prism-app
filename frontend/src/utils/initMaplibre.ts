import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let initialized = false;

/** Vite cannot resolve the v6 ESM worker from import.meta.url. Call once per app. */
export function initMaplibre(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  setWorkerUrl(workerUrl);
}
