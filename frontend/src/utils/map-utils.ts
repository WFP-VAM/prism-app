import {
  MapLayerEventType,
  MapLayerMouseEvent,
  Map as MaplibreMap,
} from 'maplibre-gl';
import {
  LayerKey,
  BoundaryLayerProps,
  LayerType,
  MapEventWrapFunctionProps,
} from 'config/types';
import { getDisplayBoundaryLayers } from 'config/utils';
import { addLayer, removeLayer } from 'context/mapStateSlice';
import React, { Dispatch } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';

/**
 * Checks weither given layer is on view
 * @param map the Maplibre Map object
 * @param layerId the LayerKey
 */
export function isLayerOnView(map: MaplibreMap | undefined, layerId: LayerKey) {
  return map
    ?.getStyle()
    .layers?.map(l => l.id)
    .includes(getLayerMapId(layerId));
}

export function safeDispatchAddLayer(
  _map: MaplibreMap | undefined,
  layer: LayerType,
  dispatcher: Function,
) {
  if (!isLayerOnView(_map, layer.id) || layer.type === 'boundary') {
    dispatcher(addLayer(layer));
  }
}

export function safeDispatchRemoveLayer(
  _map: MaplibreMap | undefined,
  layer: LayerType,
  dispatcher: Dispatch<any>,
) {
  if (isLayerOnView(_map, layer.id)) {
    dispatcher(removeLayer(layer));
  }
}

/**
 * Get all boundaries already on the map
 * @param map the Maplibre Map object
 */
export function boundariesOnView(
  map: MaplibreMap | undefined,
): BoundaryLayerProps[] {
  const boundaries = getDisplayBoundaryLayers();
  const onViewLayerKeys = map
    ?.getStyle()
    .layers?.map(l => l.id)
    .filter(s => s && s.toString().includes('layer-'))
    .map(k => k && k.toString().split('layer-')[1]);
  return boundaries.filter(
    b => onViewLayerKeys && onViewLayerKeys.includes(b.id),
  );
}

/**
 * Get first boundary id already on the map
 * @param map the Maplibre Map object
 */
export function firstBoundaryOnView(map: MaplibreMap | undefined): LayerKey {
  return map
    ?.getStyle()
    .layers?.find(l => l.id.endsWith('boundaries'))
    ?.id?.split('-')[1] as LayerKey;
}

/**
 * Refresh boundary layers
 * @param map the Maplibre Map object
 * @param dispatcher dispatch function
 */
export function refreshBoundaries(
  map: MaplibreMap | undefined,
  dispatcher: Dispatch<any>,
) {
  const activeBoundaryLayers = boundariesOnView(map);
  // remove active boundary layers
  activeBoundaryLayers.map(l => safeDispatchRemoveLayer(map, l, dispatcher));

  const boundaryLayers = getDisplayBoundaryLayers();
  // re-add boundary layers
  boundaryLayers.map(l => safeDispatchAddLayer(map, l, dispatcher));
}

export const getLayerMapId = (layerId: string, type?: 'fill' | 'line') =>
  `layer-${layerId}${type ? `-${type}` : ''}`;

// evt emitted by map.fire has array of coordinates, but other events have an object
export const getEvtCoords = (evt: MapLayerMouseEvent) =>
  Array.isArray(evt.lngLat) ? evt.lngLat : [evt.lngLat.lng, evt.lngLat.lat];

export function useMapCallback<T extends keyof MapLayerEventType, U>(
  type: T,
  layerId: string,
  layer: U,
  listener: (
    props: MapEventWrapFunctionProps<U>,
  ) => (ev: MapLayerEventType[T] & Object) => void,
) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const { t } = useSafeTranslation();

  React.useEffect(() => {
    if (!map) {
      return () => {};
    }

    map.on(type, layerId, listener({ dispatch, layer, t }));
    return () => {
      map.off(type, layerId, listener({ dispatch, layer, t }));
    };
    // We remove "t" from the callback dependencies because
    // to avoid errors with map.off breaking clicks on boundaries for alerts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, layer, layerId, listener, map, type]);
}

// TODO: maplibre: fix feature
export const findFeature = (layerId: string, evt: MapLayerMouseEvent) =>
  evt.features?.find((x: any) => x.layer.id === layerId) as any;
