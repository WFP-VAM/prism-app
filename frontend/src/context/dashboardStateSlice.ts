import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import { DashboardElementType } from 'config/types';
import { Map as MaplibreMap } from 'maplibre-gl';
import { MapState, DateRange } from 'context/mapStateSlice';
import { LayerDefinitions } from 'config/utils';
import { keepLayer } from 'utils/keep-layer-utils';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { getLayerMapId } from 'utils/map-utils';

import type {
  ConfiguredReport,
  LayerType,
  DashboardMapConfig,
} from 'config/types';
import type { RootState } from './store';

type MapGetter = () => MaplibreMap | undefined;

interface OpacityEntry {
  mapLayerId: string;
  opacityType: string;
  value: number;
}

interface SetDashboardOpacityParams {
  map: MaplibreMap | undefined;
  layerId: LayerType['id'] | undefined;
  layerType: LayerType['type'] | 'analysis' | undefined;
  value: number;
  callback?: (v: number) => void;
}

export interface DashboardMapState extends MapState {
  opacityMap: { [key: string]: OpacityEntry };
}

export type DashboardMode = 'edit' | 'preview';

export interface DashboardState {
  selectedDashboardIndex: number;
  title: string;
  mode: DashboardMode;
  flexElements: ConfiguredReport['flexElements'];
  maps: DashboardMapState[];
  syncMapsEnabled: boolean;
  sharedViewport?: {
    bounds: [number, number, number, number]; // [west, south, east, north]
    zoom: number;
  };
}

const getDashboardConfig = (index: number) => {
  if (
    !Array.isArray(appConfig.configuredReports) ||
    appConfig.configuredReports.length === 0
  ) {
    // Return a fallback config object or throw an error
    return { title: 'Dashboard', flexElements: [], maps: [] };
  }
  return appConfig.configuredReports[index] || appConfig.configuredReports[0];
};

const getMapLayerOpacityConfig = (
  layerId: LayerType['id'],
  layerType: LayerType['type'] | 'analysis',
): [string, string] => {
  switch (layerType) {
    case 'wms':
    case 'static_raster':
      return [getLayerMapId(layerId), 'raster-opacity'];
    case 'admin_level_data':
    case 'composite':
    case 'impact':
    case 'geojson_polygon':
      return [getLayerMapId(layerId), 'fill-opacity'];
    case 'point_data':
      if (layerId?.includes('_report')) {
        return [getLayerMapId(layerId), 'fill-opacity'];
      }
      return [getLayerMapId(layerId), 'circle-opacity'];
    case 'analysis':
      return ['layer-analysis', 'fill-opacity'];
    default:
      return [getLayerMapId(layerId), 'fill-opacity'];
  }
};

const createInitialState = (dashboardIndex: number = 0): DashboardState => {
  const dashboardConfig = getDashboardConfig(dashboardIndex);

  return {
    selectedDashboardIndex: dashboardIndex,
    title: dashboardConfig?.title || 'Dashboard',
    mode: 'preview' as DashboardMode,
    flexElements: dashboardConfig?.flexElements || [],
    syncMapsEnabled: false,
    sharedViewport: undefined,
    maps:
      dashboardConfig?.maps?.map((mapConfig: DashboardMapConfig) => {
        // Process pre-selected layers
        const preSelectedLayers: LayerType[] = [];
        const initialOpacityMap: { [key: string]: OpacityEntry } = {};

        if (mapConfig.preSelectedMapLayers) {
          mapConfig.preSelectedMapLayers.forEach(layerConfig => {
            const layerId =
              typeof layerConfig === 'string'
                ? layerConfig
                : layerConfig.layerId;
            const opacity =
              typeof layerConfig === 'string'
                ? 1.0
                : (layerConfig.opacity ?? 1.0);

            const layer = LayerDefinitions[layerId];
            if (layer) {
              // eslint-disable-next-line fp/no-mutating-methods
              preSelectedLayers.push(layer);
              const [mapLayerId, opacityType] = getMapLayerOpacityConfig(
                layerId,
                layer.type,
              );
              // eslint-disable-next-line fp/no-mutation
              initialOpacityMap[layerId] = {
                mapLayerId,
                opacityType,
                value: opacity,
              };
            } else {
              console.warn(
                `Pre-selected layer "${layerId}" not found in LayerDefinitions`,
              );
            }
          });
        }

        return {
          layers: preSelectedLayers,
          dateRange: {
            startDate: mapConfig.defaultDate
              ? new Date(mapConfig.defaultDate).getTime()
              : undefined,
          },
          maplibreMap: () => undefined,
          errors: [],
          layersData: [],
          loadingLayerIds: [],
          boundaryRelationData: {},
          opacityMap: initialOpacityMap,
          minMapBounds: mapConfig.minMapBounds,
        };
      }) || [],
  };
};

const initialState: DashboardState = createInitialState();

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState,
  reducers: {
    setSelectedDashboard: (_state, action: PayloadAction<number>) => {
      const dashboardIndex = action.payload;
      return createInitialState(dashboardIndex);
    },
    toggleMapSync: state => {
      const newSyncEnabled = !state.syncMapsEnabled;
      return {
        ...state,
        syncMapsEnabled: newSyncEnabled,
        sharedViewport: newSyncEnabled ? state.sharedViewport : undefined,
      };
    },
    setSharedViewport: (
      state,
      action: PayloadAction<{
        bounds: [number, number, number, number];
        zoom: number;
      }>,
    ) => ({
      ...state,
      sharedViewport: action.payload,
    }),
    setTitle: (state, action: PayloadAction<string>) => ({
      ...state,
      title: action.payload,
    }),
    setMode: (state, action: PayloadAction<DashboardMode>) => ({
      ...state,
      mode: action.payload,
    }),
    setTextContent: (
      state,
      action: PayloadAction<{ index: number; content: string }>,
    ) => {
      const { index, content } = action.payload;
      return {
        ...state,
        flexElements: state.flexElements.map((element, i) =>
          i === index ? { type: DashboardElementType.TEXT, content } : element,
        ),
      };
    },
    addLayerToMap: (
      state,
      action: PayloadAction<{ index: number; layer: LayerType }>,
    ) => {
      const { index, layer } = action.payload;
      const layersToAdd = layer?.group?.activateAll
        ? Object.values(LayerDefinitions).filter(l =>
            layer?.group?.layers?.map(subLayer => subLayer.id).includes(l.id),
          )
        : [layer];
      const filteredLayers = state.maps[index].layers.filter(l =>
        keepLayer(l, layer),
      );

      const newLayers =
        layer.type === 'boundary'
          ? [...filteredLayers, ...layersToAdd]
          : [...filteredLayers, ...layersToAdd];

      const dedupedLayers = newLayers.filter(
        (l, i, self) =>
          i === self.findIndex(t => t.id === l.id && t.type === l.type),
      );

      return {
        ...state,
        maps: state.maps.map((mapInstance, i) =>
          i === index
            ? {
                ...mapInstance,
                layers: dedupedLayers,
              }
            : mapInstance,
        ),
      };
    },
    removeLayerFromMap: (
      state,
      action: PayloadAction<{ index: number; layer: LayerType }>,
    ) => {
      const { index, layer } = action.payload;
      const filteredLayers = state.maps[index].layers.filter(l =>
        keepLayer(l, layer),
      );

      return {
        ...state,
        maps: state.maps.map((mapInstance, i) =>
          i === index
            ? { ...mapInstance, layers: filteredLayers }
            : mapInstance,
        ),
      };
    },
    updateMapDateRange: (
      state,
      action: PayloadAction<{ index: number; dateRange: DateRange }>,
    ) => {
      const { index, dateRange } = action.payload;

      return {
        ...state,
        maps: state.maps.map((mapInstance, i) =>
          i === index ? { ...mapInstance, dateRange } : mapInstance,
        ),
      };
    },
    setMap: (
      state,
      action: PayloadAction<{ index: number; maplibreMap: MapGetter }>,
    ) => {
      const { index, maplibreMap } = action.payload;
      return {
        ...state,
        maps: state.maps.map((mapInstance, i) =>
          i === index ? { ...mapInstance, maplibreMap } : mapInstance,
        ),
      };
    },
    removeLayerData: (
      state,
      action: PayloadAction<{ index: number; layer: LayerType }>,
    ) => {
      const { index, layer } = action.payload;
      return {
        ...state,
        maps: state.maps.map((mapInstance, i) =>
          i === index
            ? {
                ...mapInstance,
                layersData: mapInstance.layersData.filter(
                  ({ layer: dataLayer }) => dataLayer.id !== layer.id,
                ),
              }
            : mapInstance,
        ),
      };
    },
    setBoundaryRelationData: (
      state,
      action: PayloadAction<{ index: number; data: BoundaryRelationsDict }>,
    ) => {
      const { index, data } = action.payload;
      return {
        ...state,
        maps: state.maps.map((mapInstance, i) =>
          i === index
            ? { ...mapInstance, boundaryRelationData: data }
            : mapInstance,
        ),
      };
    },
    dismissError: (
      state,
      action: PayloadAction<{ index: number; error: string }>,
    ) => {
      const { index, error } = action.payload;
      return {
        ...state,
        maps: state.maps.map((mapInstance, i) =>
          i === index
            ? {
                ...mapInstance,
                errors: mapInstance.errors.filter(msg => msg !== error),
              }
            : mapInstance,
        ),
      };
    },
    setDashboardOpacity: (
      state,
      action: PayloadAction<{ index: number } & SetDashboardOpacityParams>,
    ) => {
      const { index, map, layerId, layerType, value, callback } =
        action.payload;

      if (!map || !layerId || value === undefined || !layerType) {
        return state;
      }

      const [mapLayerId, opacityType] = getMapLayerOpacityConfig(
        layerId,
        layerType,
      );

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
        maps: state.maps.map((mapInstance, i) =>
          i === index
            ? {
                ...mapInstance,
                opacityMap: {
                  ...mapInstance.opacityMap,
                  [layerId]: {
                    mapLayerId,
                    opacityType,
                    value,
                  },
                },
              }
            : mapInstance,
        ),
      };
    },
  },
});

// Getters
export const selectedDashboardIndexSelector = (state: RootState): number =>
  state.dashboardState.selectedDashboardIndex;

export const dashboardTitleSelector = (state: RootState): string =>
  state.dashboardState.title;

export const dashboardModeSelector = (state: RootState): DashboardMode =>
  state.dashboardState.mode;

export const dashboardFlexElementsSelector = (
  state: RootState,
): ConfiguredReport['flexElements'] => state.dashboardState.flexElements;

export const dashboardMapsSelector = (state: RootState): DashboardMapState[] =>
  state.dashboardState.maps;

export const dashboardSyncEnabledSelector = (state: RootState): boolean =>
  state.dashboardState.syncMapsEnabled;

export const dashboardSharedViewportSelector = (
  state: RootState,
): DashboardState['sharedViewport'] => state.dashboardState.sharedViewport;

export const dashboardOpacitySelector =
  (index: number, layerId: string) =>
  (state: RootState): number | undefined =>
    state.dashboardState.maps[index]?.opacityMap[layerId]?.value;

// Setters
export const {
  setSelectedDashboard,
  toggleMapSync,
  setSharedViewport,
  addLayerToMap,
  removeLayerFromMap,
  setTitle,
  setMode,
  setTextContent,
  updateMapDateRange,
  setMap,
  removeLayerData,
  setBoundaryRelationData,
  dismissError,
  setDashboardOpacity,
} = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
