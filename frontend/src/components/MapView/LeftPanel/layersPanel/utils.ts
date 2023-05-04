import { LayerType } from '../../../../config/types';

/**
 * Filters the active layers in the layers panel
 * based on the selected layers from the app store and the categoryLayers from the app config
 */
export const filterActiveLayers = (
  selectedLayer: LayerType,
  categoryLayer: LayerType,
): boolean | undefined => {
  return (
    selectedLayer.id === categoryLayer.id ||
    (categoryLayer.group &&
      categoryLayer.group.layers.some(l => l.id === selectedLayer.id))
  );
};
