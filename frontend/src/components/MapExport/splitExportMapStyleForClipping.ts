import type { LayerSpecification, Map, StyleSpecification } from 'maplibre-gl';

import { transparentDataOverlayMapStyle } from './transparentDataOverlayMapStyle';

export function isBasemapLabelLayer(layer: { id: string }): boolean {
  return layer.id.includes('label');
}

export function splitExportMapStyleForClipping(
  style: StyleSpecification,
  showLabels: boolean,
): {
  basemapStyle: StyleSpecification;
  labelsStyle: StyleSpecification | null;
} {
  const labelLayers = style.layers.filter(isBasemapLabelLayer);
  const basemapLayers = style.layers.filter(
    layer => !isBasemapLabelLayer(layer),
  );

  const basemapStyle: StyleSpecification = {
    ...style,
    layers: basemapLayers,
  };

  if (!showLabels || labelLayers.length === 0) {
    return { basemapStyle, labelsStyle: null };
  }

  const labelsStyle: StyleSpecification = {
    ...style,
    layers: [
      ...(transparentDataOverlayMapStyle.layers as LayerSpecification[]),
      ...labelLayers,
    ],
  };

  return { basemapStyle, labelsStyle };
}

export function removeBasemapLabelLayersFromMap(map: Map): void {
  const style = map.getStyle();
  if (!style?.layers) {
    return;
  }

  [...style.layers]
    .filter(isBasemapLabelLayer)
    .reverse()
    .forEach(layer => {
      if (map.getLayer(layer.id)) {
        map.removeLayer(layer.id);
      }
    });
}
