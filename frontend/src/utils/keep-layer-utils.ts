import { LayerType } from '../config/types';

// Layer types that are allowed to have multiple layers overlap on the map.
export const TYPES_ALLOWED_TO_OVERLAP = [
  'boundary',
  'point_data',
  'static_raster',
];

export function keepLayer(layer: LayerType, newLayer: LayerType) {
  // Simple function to control which layers can overlap.
  // The same data can not be loaded twice.
  if (newLayer.id === layer.id) {
    return false;
  }

  // Different types of layers can overlap.
  if (newLayer.type !== layer.type) {
    return true;
  }

  // Temporary hack preventing the overlap of kobo layers.
  // Not needed when kobo layers will be treated as admin_level_data. See issue #760.
  if (
    newLayer.type === 'point_data' &&
    layer.type === 'point_data' &&
    newLayer.dateUrl.includes('kobo') &&
    layer.dateUrl.includes('kobo')
  ) {
    return false;
  }

  // Some types are allowed to overlap. See defintion above.
  if (TYPES_ALLOWED_TO_OVERLAP.includes(newLayer.type)) {
    return true;
  }

  return false;
}
