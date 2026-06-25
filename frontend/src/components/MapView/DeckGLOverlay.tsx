import { MapboxOverlay } from '@deck.gl/mapbox';
import type { IControl } from 'maplibre-gl';
import { memo, useEffect } from 'react';
import { useControl } from 'react-map-gl/maplibre';

import { useDeckGLLayers } from './DeckGLLayersContext';

/**
 * DeckGLOverlay mounts a single deck.gl MapboxOverlay as a MapLibre IControl
 * (via react-map-gl's `useControl`) and keeps it in sync with the shared
 * DeckGLLayersContext.
 *
 * Must be rendered as a child of the react-map-gl <Map> component, inside a
 * <DeckGLLayersProvider>.
 *
 * We use `interleaved: true` so that deck.gl layers share the MapLibre WebGL2
 * context and respect `beforeId` layer ordering (e.g. render below labels).
 */
const DeckGLOverlay = memo(() => {
  const { layers, version } = useDeckGLLayers();

  // useControl runs once to create the MapboxOverlay IControl.
  // The type cast works around a TypeScript structural mismatch between
  // @deck.gl/mapbox's MapboxOverlay and maplibre-gl's IControl.
  const overlay = useControl(
    () =>
      new MapboxOverlay({
        interleaved: true,
        layers: [],
      }) as unknown as IControl,
  ) as unknown as MapboxOverlay;

  // Push updated layers to the overlay whenever the registry changes.
  useEffect(() => {
    overlay?.setProps({ layers: Array.from(layers.values()) });
    // `version` is the trigger — it bumps whenever layers Map mutates.
  }, [overlay, version]);

  return null;
});

export default DeckGLOverlay;
