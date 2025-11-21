import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LayerType } from 'config/types';
import { getLayerMapId } from 'utils/map-utils';
import { Map as MaplibreMap } from 'maplibre-gl';
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
      const [mapLayerId, opacityType] = ((): [string, string] => {
        switch (layerType) {
          case 'wms':
            return [getLayerMapId(layerId), 'raster-opacity'];
          case 'static_raster':
            return [getLayerMapId(layerId), 'raster-opacity'];
          case 'admin_level_data':
          case 'composite':
          case 'impact':
          case 'geojson_polygon':
            return [getLayerMapId(layerId), 'fill-opacity'];
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
      })();

      // update map
      if (map.getLayer(mapLayerId) !== undefined && value !== undefined) {
        map.setPaintProperty(mapLayerId, opacityType, value);
        // force a update of the map style to ensure the change is reflected
        // see https://github.com/maplibre/maplibre-gl-js/issues/3373
        // TODO - check if the above issue got resolved from time to time.
        // eslint-disable-next-line no-underscore-dangle
        map.style._updateLayer(mapLayerId as any);
      }

      if (callback !== undefined) {
        callback(value);
      }

      return {
        ...state,
        opacityMap: {
          ...state.opacityMap,
          [layerId]: {
            mapLayerId,
            opacityType,
            value,
          },
        },
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
