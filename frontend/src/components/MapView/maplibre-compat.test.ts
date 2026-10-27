import { ensureMapTransform } from './maplibre-compat';

describe('ensureMapTransform', () => {
  it('exposes the camera transform on MapLibre v6 maps', () => {
    const transform = { height: 900 };
    const map: { transform?: unknown; _camera: { transform: unknown } } = {
      _camera: { transform },
    };
    ensureMapTransform(map);
    expect(map.transform).toBe(transform);

    // Stays live when the camera swaps its transform (e.g. projection change).
    const next = { height: 600 };
    map._camera.transform = next;
    expect(map.transform).toBe(next);
  });

  it('leaves maps that already expose transform untouched', () => {
    const transform = { height: 900 };
    const map = { transform, _camera: { transform: { height: 1 } } };
    ensureMapTransform(map);
    expect(map.transform).toBe(transform);
  });
});
