import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerKey } from '../config/types';

export function isLayerOnView(
  map: MapBoxMap | undefined,
  boundaryId: LayerKey,
) {
  return map
    ?.getStyle()
    .layers?.map(l => l.id)
    .includes(`${boundaryId}-line`);
}
