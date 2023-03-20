import { LayerType } from '../config/types';
import { TYPES_ALLOWED_TO_OVERLAP } from '../config/utils';

export function keepLayer(layer: LayerType, newLayer: LayerType) {
  // Simple function to control which layers can overlap.
  if (newLayer.id === layer.id) {
    return false;
  }
  if (newLayer.type !== layer.type) {
    return true;
  }
  // Temporary hack for kobo layers. Not needed when kobo layers will be treated as admin_level_data
  if (
    newLayer.type === 'point_data' &&
    layer.type === 'point_data' &&
    newLayer.dateUrl.includes('kobo') &&
    layer.dateUrl.includes('kobo')
  ) {
    return false;
  }
  if (TYPES_ALLOWED_TO_OVERLAP.includes(newLayer.type)) {
    return true;
  }
  return false;
}
