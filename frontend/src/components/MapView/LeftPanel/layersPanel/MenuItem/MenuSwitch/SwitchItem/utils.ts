import { Map as MaplibreMap } from 'maplibre-gl';
import { UrlLayerKey } from '../../../../../../../utils/url-utils';
import { LayerKey, LayerType } from '../../../../../../../config/types';
import {
  getDisplayBoundaryLayers,
  LayerDefinitions,
} from '../../../../../../../config/utils';
import {
  safeDispatchAddLayer,
  safeDispatchRemoveLayer,
} from '../../../../../../../utils/map-utils';

export function toggleRemoveLayer(
  layer: LayerType,
  _map: MaplibreMap | undefined,
  urlLayerKey: UrlLayerKey,
  removeLayerAction: (layer: LayerType) => void,
  removeLayerFromUrl: Function,
  addLayerAction: (layer: LayerType) => void,
) {
  removeLayerFromUrl(urlLayerKey, layer.id);
  removeLayerAction(layer);

  // For admin boundary layers with boundary property
  // we have to de-activate the unique boundary and re-activate
  // default boundaries
  if (!('boundary' in layer)) {
    return;
  }
  const boundaryId = layer.boundary || '';
  if (!Object.keys(LayerDefinitions).includes(boundaryId)) {
    return;
  }
  const displayBoundaryLayers = getDisplayBoundaryLayers();
  const uniqueBoundaryLayer = LayerDefinitions[boundaryId as LayerKey];

  if (!displayBoundaryLayers.map(l => l.id).includes(uniqueBoundaryLayer.id)) {
    safeDispatchRemoveLayer(_map, uniqueBoundaryLayer, removeLayerAction);
  }

  displayBoundaryLayers.forEach(l => {
    safeDispatchAddLayer(_map, l, addLayerAction);
  });
}
