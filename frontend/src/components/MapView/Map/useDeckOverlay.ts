import { MapboxOverlay } from '@deck.gl/mapbox';
import { useControl } from 'react-map-gl/maplibre';
import type { Layer } from '@deck.gl/core';

export function useDeckOverlay(layers: Layer[]) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true }),
  );
  overlay.setProps({ layers });
  return overlay;
}
