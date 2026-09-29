export type MapWithCamera = {
  transform?: unknown;
  _camera?: { transform: unknown };
};

/**
 * MapLibre v6 moved camera state off the Map (`map.transform` is now
 * `map._camera.transform`), but @deck.gl/mapbox (<= 9.4) still reads
 * `map.transform` in interleaved mode and crashes on every frame. Restore the
 * old accessor until deck.gl supports MapLibre v6 natively.
 */
export function ensureMapTransform(map: MapWithCamera): void {
  if (map.transform !== undefined || !map._camera) {
    return;
  }
  Object.defineProperty(map, 'transform', {
    configurable: true,
    get(this: MapWithCamera) {
      return this._camera?.transform;
    },
  });
}
