import { LayerType } from 'config/types';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  firstBoundaryOnView,
  getLayerMapId,
  isLayerOnView,
} from 'utils/map-utils';

/**
 * Layer types that insert using only `firstSymbolId` as anchor (see MapView/Map).
 * Keep in sync with `components/MapView/Map/index.tsx` consumers.
 */
export const LAYERS_ABOVE_BOUNDARIES = [
  'anticipatory_action',
  'geojson_polygon',
] as const;

export function layerUsesSymbolAnchorOnly(layer: LayerType): boolean {
  return LAYERS_ABOVE_BOUNDARIES.includes(
    layer.type as (typeof LAYERS_ABOVE_BOUNDARIES)[number],
  );
}

/** Boundaries first, then other layers — correct stack for chained MapLibre `beforeId`. */
export function stackLayersForMapPaintOrder<T extends LayerType>(
  selectedLayers: T[],
): T[] {
  const boundaries = selectedLayers.filter(l => l.type === 'boundary');
  const rest = selectedLayers.filter(l => l.type !== 'boundary');
  if (boundaries.length === 0) {
    return selectedLayers;
  }
  return [...boundaries, ...rest];
}

export function getFirstBoundaryLayerMapId(
  map: MaplibreMap | undefined,
): string | undefined {
  const boundaryId = firstBoundaryOnView(map);
  return boundaryId ? getLayerMapId(boundaryId) : undefined;
}

export type GetLayerBeforeIdParams = {
  aboveBoundaries: boolean;
  stackLayers: LayerType[];
  map: MaplibreMap | undefined;
  firstSymbolId: string | undefined;
  firstBoundaryLayerMapId: string | undefined;
};

/** Single implementation for MapView and MapExportLayout `before` / `beforeId` chaining. */
export function getLayerBeforeId(
  index: number,
  {
    aboveBoundaries,
    stackLayers,
    map,
    firstSymbolId,
    firstBoundaryLayerMapId,
  }: GetLayerBeforeIdParams,
): string | undefined {
  if (index === 0) {
    return firstSymbolId;
  }
  if (aboveBoundaries) {
    return firstSymbolId;
  }
  const previousLayerId = stackLayers[index - 1].id;
  if (isLayerOnView(map, previousLayerId)) {
    return getLayerMapId(previousLayerId);
  }
  return firstBoundaryLayerMapId || firstSymbolId;
}
