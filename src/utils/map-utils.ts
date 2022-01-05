import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerKey } from '../config/types';

export function isLayerOnView(map: MapBoxMap | undefined, layerId: LayerKey) {
  return map
    ?.getStyle()
    .layers?.map(l => l.source)
    .includes(`layer-${layerId}`);
}
