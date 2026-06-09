import type { StyleSpecification } from 'maplibre-gl';

/** Minimal style so a second map can render data layers over an existing basemap. */
export const transparentDataOverlayMapStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#000000',
        'background-opacity': 0,
      },
    },
  ],
};
