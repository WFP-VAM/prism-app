import { LayerType } from 'config/types';

export const isBoundaryLayer = (layer: LayerType): boolean =>
  layer.type === 'boundary' ||
  layer.type === 'admin_level_data' ||
  layer.id.includes('admin');

export const getNonBoundaryLayers = (layers: LayerType[]): LayerType[] =>
  layers.filter(layer => !isBoundaryLayer(layer));
