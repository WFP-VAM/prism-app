import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LayerKey, LayerType } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { Map as MaplibreMap } from 'maplibre-gl';
import { getLayerMapId } from 'utils/map-utils';

import type { RootState } from './store';

interface OpacityEntry {
  mapLayerId: string;
  opacityType: string;
  value: number;
}

export interface MapOpacityState {
  // layerId is the key
  opacityMap: { [key: string]: OpacityEntry };
  error: string | null;
}

export interface SetOpacityParams {
  map: MaplibreMap | undefined;
  layerId: LayerType['id'] | undefined;
  layerType: LayerType['type'] | 'analysis' | undefined;
  value: number;
  callback?: (v: number) => void;
}

const initialState: MapOpacityState = {
  opacityMap: {},
  error: null,
};

type OpacityLayerType = LayerType['type'] | 'analysis' | undefined;

/** activateAll groups (e.g. FTW density + boundaries) share one slider value. */
function activateAllTargetIds(layerId: string): string[] {
  for (const def of Object.values(LayerDefinitions)) {
    const { group } = def;
    if (group?.activateAll && group.layers.some(l => l.id === layerId)) {
      return group.layers.map(l => l.id);
    }
  }
  return [layerId];
}

function paintTargetForLayer(
  layerId: string,
  layerType: OpacityLayerType,
): [string, string] {
  switch (layerType) {
    case 'wms':
    case 'cog':
      return [getLayerMapId(layerId), 'raster-opacity'];
    case 'static_raster':
      return [getLayerMapId(layerId), 'raster-opacity'];
    case 'admin_level_data':
    case 'composite':
    case 'impact':
    case 'geojson_polygon':
      return [getLayerMapId(layerId), 'fill-opacity'];
    case 'pmtiles_vector':
      return [getLayerMapId(layerId, 'fill'), 'fill-opacity'];
    case 'point_data':
      // This is a hacky way to support opacity change for Kobo data.
      // TODO - Handle Kobo data as admin_level_data instead of point_data. See issue #760.
      if (layerId?.includes('_report')) {
        return [getLayerMapId(layerId), 'fill-opacity'];
      }
      return [getLayerMapId(layerId), 'icon-opacity'];
    case 'analysis':
      return ['layer-analysis', 'fill-opacity'];
    default:
      throw new Error('Unknown map layer type');
  }
}

export const opacityStateSlice = createSlice({
  name: 'opacityState',
  initialState,
  reducers: {
    setOpacity: (state, action: PayloadAction<SetOpacityParams>) => {
      const { map, layerId, layerType, value, callback } =
        action?.payload || {};
      if (!map) {
        return state;
      }
      if (!layerId) {
        return state;
      }

      const targetIds = activateAllTargetIds(layerId);
      const opacityMap = { ...state.opacityMap };

      targetIds.forEach(targetId => {
        const targetType: OpacityLayerType =
          targetId === layerId
            ? layerType
            : (LayerDefinitions[targetId as LayerKey]?.type ?? layerType);
        const [mapLayerId, opacityType] = paintTargetForLayer(
          targetId,
          targetType,
        );

        // COG is deck.gl (no MapLibre paint). PMTiles scales fill/line in React.
        if (
          targetType !== 'cog' &&
          targetType !== 'pmtiles_vector' &&
          map.getLayer(mapLayerId) !== undefined &&
          value !== undefined
        ) {
          map.setPaintProperty(mapLayerId, opacityType, value);
        }

        opacityMap[targetId] = {
          mapLayerId,
          opacityType,
          value,
        };
      });

      if (callback !== undefined) {
        callback(value);
      }

      return {
        ...state,
        opacityMap,
      };
    },
  },
});

// Getters
export const opacitySelector =
  (layerId: string) =>
  (state: RootState): number | undefined =>
    state.opacityState.opacityMap[layerId]?.value;

// Setters
export const { setOpacity } = opacityStateSlice.actions;

export default opacityStateSlice.reducer;
