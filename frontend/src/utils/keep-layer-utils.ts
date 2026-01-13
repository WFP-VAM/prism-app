import { LayerType, MenuGroup } from 'config/types';
import { menuList } from 'components/MapView/LeftPanel/utils';
import { isAnticipatoryActionLayer } from 'config/utils';

// Layer types that are allowed to have multiple layers overlap on the map.
export const TYPES_ALLOWED_TO_OVERLAP = [
  'boundary',
  'point_data',
  'static_raster',
];

// finds layer's group as defined in "categories" in "prism.json"
function getLayerGroup(layer: LayerType) {
  let group: MenuGroup | undefined;

  menuList.find(menuItem =>
    menuItem.layersCategories.find(layerCategories => {
      const foundLayer = layerCategories.layers.find(
        l =>
          l.id === layer.id || l.group?.layers.find(ll => ll.id === layer.id),
      );
      if (foundLayer) {
        group = foundLayer.group;
        return true;
      }
      return false;
    }),
  );

  return group;
}

export function keepLayer(layer: LayerType, newLayer: LayerType) {
  // Simple function to control which layers can overlap.
  // The same data can not be loaded twice.
  if (newLayer.id === layer.id) {
    return false;
  }

  if (newLayer.type === layer.type && isAnticipatoryActionLayer(layer.type)) {
    return true;
  }

  // Different types of layers can overlap.
  if (newLayer.type !== layer.type) {
    return true;
  }

  // Layers on the same group cannot overlap
  const newLayerGroup = getLayerGroup(newLayer);
  if (newLayerGroup?.layers.some(l => l.id === layer.id)) {
    return false;
  }

  // Temporary hack preventing the overlap of kobo layers.
  // Not needed when kobo layers will be treated as admin_level_data. See issue #760.
  if (
    newLayer.type === 'point_data' &&
    layer.type === 'point_data' &&
    newLayer.dateUrl?.includes('kobo') &&
    layer.dateUrl?.includes('kobo')
  ) {
    return false;
  }

  // Authorize different admin_level_data layers as long as
  // they use different fillPattern (None | right | left).
  if (
    newLayer.type === 'admin_level_data' &&
    layer.type === 'admin_level_data' &&
    newLayer.fillPattern !== layer.fillPattern
  ) {
    return true;
  }

  // Some types are allowed to overlap. See defintion above.
  return TYPES_ALLOWED_TO_OVERLAP.includes(newLayer.type);
}
