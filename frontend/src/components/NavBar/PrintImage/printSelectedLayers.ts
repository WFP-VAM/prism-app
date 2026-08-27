import { DECK_GL_LAYER_TYPES } from 'components/MapView/DeckGLLayersContext';
import { LayerType } from 'config/types';
import { getDisplayBoundaryLayers, LayerDefinitions } from 'config/utils';

/**
 * Layers passed to MapExportLayout in the print dialog preview.
 *
 * Default print mode clones the main map's MapLibre style (works for WMS rasters).
 * COG/Zarr render via deck.gl and are not in that style — they must be drawn by
 * MapExportLayout (same path as country-mask and batch export).
 */
export function getPrintSelectedLayers({
  batchMapsVisibility,
  countryMask,
  deferredLayerIdForPreview,
  selectedLayers,
}: {
  batchMapsVisibility: boolean;
  countryMask: boolean;
  deferredLayerIdForPreview: string | null;
  selectedLayers: LayerType[];
}): LayerType[] {
  if (
    batchMapsVisibility &&
    deferredLayerIdForPreview &&
    LayerDefinitions[deferredLayerIdForPreview]
  ) {
    return [
      LayerDefinitions[deferredLayerIdForPreview],
      ...getDisplayBoundaryLayers().reverse(),
    ];
  }

  if (selectedLayers.length === 0) {
    return [];
  }

  const needsLayoutRendering =
    countryMask ||
    selectedLayers.some(layer => DECK_GL_LAYER_TYPES.has(layer.type));

  return needsLayoutRendering ? selectedLayers : [];
}
