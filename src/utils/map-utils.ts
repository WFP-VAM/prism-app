import { AnyLayer, AnySourceData, Map as MapBoxMap } from 'mapbox-gl';
import { LayerKey, BoundaryLayerProps, LayerType } from '../config/types';
import { getDisplayBoundaryLayers } from '../config/utils';
import { addLayer, removeLayer } from '../context/mapStateSlice';

// fixes the issue that property 'source' is not guaranteed to exist on type 'AnyLayer'
// because 'CustomLayerInterface' does not specify a 'source' property
// see maplibre-gl/src/index.d.ts
type CustomAnyLayer = AnyLayer & { source?: string | AnySourceData };

/**
 * Checks weither given layer is on view
 * @param map the MapBox Map object
 * @param layerId the LayerKey
 */
export function isLayerOnView(map: MapBoxMap | undefined, layerId: LayerKey) {
  return map
    ?.getStyle()
    .layers?.map((l: CustomAnyLayer) => l.source)
    .includes(`layer-${layerId}`);
}

export function safeDispatchAddLayer(
  _map: MapBoxMap | undefined,
  layer: LayerType,
  dispatcher: Function,
) {
  if (!isLayerOnView(_map, layer.id) || layer.type === 'boundary') {
    dispatcher(addLayer(layer));
  }
}

export function safeDispatchRemoveLayer(
  _map: MapBoxMap | undefined,
  layer: LayerType,
  dispatcher: Function,
) {
  if (isLayerOnView(_map, layer.id)) {
    dispatcher(removeLayer(layer));
  }
}

/**
 * Get all boundaries already on the map
 * @param map the MapBox Map object
 */
export function boundariesOnView(
  map: MapBoxMap | undefined,
): BoundaryLayerProps[] {
  const boundaries = getDisplayBoundaryLayers();
  const onViewLayerKeys = map
    ?.getStyle()
    .layers?.map((l: CustomAnyLayer) => l.source)
    .filter(s => s && s.toString().includes('layer-'))
    .map(k => k && k.toString().split('layer-')[1]);
  return boundaries.filter(
    b => onViewLayerKeys && onViewLayerKeys.includes(b.id),
  );
}

/**
 * Get first boundary id already on the map
 * @param map the MapBox Map object
 */
export function firstBoundaryOnView(map: MapBoxMap | undefined): LayerKey {
  return map
    ?.getStyle()
    .layers?.find(l => l.id.endsWith('boundaries-line'))
    ?.id?.split('-')[1] as LayerKey;
}

/**
 * Refresh boundary layers
 * @param map the MapBox Map object
 * @param dispatcher dispatch function
 */
export function refreshBoundaries(
  map: MapBoxMap | undefined,
  dispatcher: Function,
) {
  const activeBoundaryLayers = boundariesOnView(map);
  // remove active boundary layers
  activeBoundaryLayers.map(l => safeDispatchRemoveLayer(map, l, dispatcher));

  const boundaryLayers = getDisplayBoundaryLayers();
  // re-add boundary layers
  boundaryLayers.map(l => safeDispatchAddLayer(map, l, dispatcher));
}
