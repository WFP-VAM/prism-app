import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerKey, BoundaryLayerProps } from '../config/types';
import { getBoundaryLayers } from '../config/utils';

export function isLayerOnView(map: MapBoxMap | undefined, layerId: LayerKey) {
  return map
    ?.getStyle()
    .layers?.map(l => l.source)
    .includes(`layer-${layerId}`);
}

/**
 * Get all boundaries already on the map
 * @param map the MapBox Map object
 */
export function boundariesOnView(
  map: MapBoxMap | undefined,
): BoundaryLayerProps[] {
  const boundaries = getBoundaryLayers();
  const onViewLayerKeys = map
    ?.getStyle()
    .layers?.map(l => l.source)
    .filter(s => s && s.toString().includes('layer-'))
    .map(k => k && k.toString().split('layer-')[1]);
  return boundaries.filter(
    b => onViewLayerKeys && onViewLayerKeys.includes(b.id),
  );
}
