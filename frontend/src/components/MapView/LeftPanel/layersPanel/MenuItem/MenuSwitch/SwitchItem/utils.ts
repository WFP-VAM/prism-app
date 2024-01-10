import { Map as MapBoxMap } from 'mapbox-gl';
import { Dispatch } from 'react';
import { UrlLayerKey } from '../../../../../../../utils/url-utils';
import { LayerKey, LayerType } from '../../../../../../../config/types';
import { removeLayer } from '../../../../../../../context/mapStateSlice';
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
  _map: MapBoxMap | undefined,
  urlLayerKey: UrlLayerKey,
  dispatcher: Dispatch<any>,
  removeLayerFromUrl: Function,
) {
  removeLayerFromUrl(urlLayerKey, layer.id);
  dispatcher(removeLayer(layer));

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
    safeDispatchRemoveLayer(_map, uniqueBoundaryLayer, dispatcher);
  }

  displayBoundaryLayers.forEach(l => {
    safeDispatchAddLayer(_map, l, dispatcher);
  });
}
