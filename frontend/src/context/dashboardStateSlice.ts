import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';

import { Map as MaplibreMap } from 'maplibre-gl';
import { MapState, DateRange } from 'context/mapStateSlice';
import { LayerDefinitions } from 'config/utils';
import { keepLayer } from 'utils/keep-layer-utils';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { getLayerMapId } from 'utils/map-utils';
import { generateSlugFromTitle } from 'utils/string-utils';

import type {
  LayerType,
  DashboardMapConfig,
  DashboardTableConfig,
  DashboardElements,
  ConfiguredReport,
} from 'config/types';
import { DashboardMode, DashboardElementType } from 'config/types';
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
  capturedViewport?: [number, number, number, number]; // [west, south, east, north]
  title?: string;
  legendVisible?: boolean; // default: true
  legendPosition?: 'left' | 'right'; // default: 'right'
}

export interface DashboardTableState {
  maxRows: number;
  sortColumn: string | number;
  sortOrder: 'asc' | 'desc';
}

export interface DashboardState {
  selectedDashboardIndex: number;
  title: string;
  mode: DashboardMode;
  columns: DashboardElements[][];
  mapStates: { [elementId: string]: DashboardMapState };
  tableStates: { [elementId: string]: DashboardTableState };
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
    return {
      title: 'Dashboard',
      path: 'dashboard',
      firstColumn: [],
      secondColumn: [],
      thirdColumn: [],
    };
  }
  const originalConfig =
    appConfig.configuredReports[index] || appConfig.configuredReports[0];

  const config = { ...originalConfig };

  if (!config.path) {
    // eslint-disable-next-line fp/no-mutation
    config.path = generateSlugFromTitle(config.title);
  }

  return config;
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

const createMapStateFromConfig = (
  mapConfig: DashboardMapConfig,
): DashboardMapState => {
  // Process pre-selected layers
  const preSelectedLayers: LayerType[] = [];
  const initialOpacityMap: { [key: string]: OpacityEntry } = {};

  if (mapConfig.preSelectedMapLayers) {
    mapConfig.preSelectedMapLayers.forEach(layerConfig => {
      const layerId =
        typeof layerConfig === 'string' ? layerConfig : layerConfig.layerId;
      const opacity =
        typeof layerConfig === 'string' ? 1.0 : (layerConfig.opacity ?? 1.0);

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
    minMapBounds: mapConfig.minMapBounds || [],
    title: mapConfig.title || '',
    legendVisible: mapConfig.legendVisible ?? true,
    legendPosition: mapConfig.legendPosition ?? 'right',
  };
};

const createTableStateFromConfig = (
  tableConfig: DashboardTableConfig,
): DashboardTableState => ({
  maxRows: tableConfig.maxRows || 10,
  sortColumn: tableConfig.sortColumn || 'name',
  sortOrder: tableConfig.sortOrder || 'asc',
});

const createInitialState = (dashboardIndex: number = 0): DashboardState => {
  const dashboardConfig = getDashboardConfig(dashboardIndex);

  const allColumns = [
    dashboardConfig?.firstColumn || [],
    dashboardConfig?.secondColumn || [],
    dashboardConfig?.thirdColumn || [],
  ];

  const mapStates: { [elementId: string]: DashboardMapState } = {};
  const tableStates: { [elementId: string]: DashboardTableState } = {};

  allColumns.forEach((column: DashboardElements[], columnIndex: number) => {
    column.forEach((element: DashboardElements, elementIndex: number) => {
      const elementId = `${columnIndex}-${elementIndex}`;

      if (element.type === DashboardElementType.MAP) {
        // eslint-disable-next-line fp/no-mutation
        mapStates[elementId] = createMapStateFromConfig(element);
      } else if (element.type === DashboardElementType.TABLE) {
        // eslint-disable-next-line fp/no-mutation
        tableStates[elementId] = createTableStateFromConfig(element);
      }
    });
  });

  return {
    selectedDashboardIndex: dashboardIndex,
    title: dashboardConfig?.title || 'Dashboard',
    mode: DashboardMode.VIEW,
    columns: allColumns,
    mapStates,
    tableStates,
    syncMapsEnabled: false,
    sharedViewport: undefined,
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
    setCapturedViewport: (
      state,
      action: PayloadAction<{
        elementId: string;
        bounds: [number, number, number, number];
      }>,
    ) => {
      const { elementId, bounds } = action.payload;
      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...state.mapStates[elementId],
            capturedViewport: bounds,
          },
        },
      };
    },
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
      action: PayloadAction<{
        columnIndex: number;
        elementIndex: number;
        content: string;
      }>,
    ) => {
      const { columnIndex, elementIndex, content } = action.payload;
      return {
        ...state,
        columns: state.columns.map((column, colIdx) =>
          colIdx === columnIndex
            ? column.map((element, elemIdx) =>
                elemIdx === elementIndex &&
                element.type === DashboardElementType.TEXT
                  ? { ...element, content }
                  : element,
              )
            : column,
        ),
      };
    },
    addLayerToMap: (
      state,
      action: PayloadAction<{ elementId: string; layer: LayerType }>,
    ) => {
      const { elementId, layer } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      const layersToAdd = layer?.group?.activateAll
        ? Object.values(LayerDefinitions).filter(l =>
            layer?.group?.layers?.map(subLayer => subLayer.id).includes(l.id),
          )
        : [layer];
      const filteredLayers = mapState.layers.filter(l => keepLayer(l, layer));

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
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            layers: dedupedLayers,
          },
        },
      };
    },
    removeLayerFromMap: (
      state,
      action: PayloadAction<{ elementId: string; layer: LayerType }>,
    ) => {
      const { elementId, layer } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      const filteredLayers = mapState.layers.filter(l => keepLayer(l, layer));

      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            layers: filteredLayers,
          },
        },
      };
    },
    updateMapDateRange: (
      state,
      action: PayloadAction<{ elementId: string; dateRange: DateRange }>,
    ) => {
      const { elementId, dateRange } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            dateRange,
          },
        },
      };
    },
    setMap: (
      state,
      action: PayloadAction<{ elementId: string; maplibreMap: MapGetter }>,
    ) => {
      const { elementId, maplibreMap } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            maplibreMap,
          },
        },
      };
    },
    removeLayerData: (
      state,
      action: PayloadAction<{ elementId: string; layer: LayerType }>,
    ) => {
      const { elementId, layer } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            layersData: mapState.layersData.filter(
              ({ layer: dataLayer }) => dataLayer.id !== layer.id,
            ),
          },
        },
      };
    },
    setBoundaryRelationData: (
      state,
      action: PayloadAction<{ elementId: string; data: BoundaryRelationsDict }>,
    ) => {
      const { elementId, data } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            boundaryRelationData: data,
          },
        },
      };
    },
    dismissError: (
      state,
      action: PayloadAction<{ elementId: string; error: string }>,
    ) => {
      const { elementId, error } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            errors: mapState.errors.filter(msg => msg !== error),
          },
        },
      };
    },
    setDashboardOpacity: (
      state,
      action: PayloadAction<{ elementId: string } & SetDashboardOpacityParams>,
    ) => {
      const { elementId, map, layerId, layerType, value, callback } =
        action.payload;

      if (!map || !layerId || value === undefined || !layerType) {
        return state;
      }

      const mapState = state.mapStates[elementId];
      if (!mapState) {
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
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            opacityMap: {
              ...mapState.opacityMap,
              [layerId]: {
                mapLayerId,
                opacityType,
                value,
              },
            },
          },
        },
      };
    },
    setMapTitle: (
      state,
      action: PayloadAction<{ elementId: string; title: string }>,
    ) => {
      const { elementId, title } = action.payload;
      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...state.mapStates[elementId],
            title,
          },
        },
      };
    },
    updateTableState: (
      state,
      action: PayloadAction<{
        elementId: string;
        updates: Partial<DashboardTableState>;
      }>,
    ) => {
      const { elementId, updates } = action.payload;
      const tableState = state.tableStates[elementId];
      if (!tableState) {
        return state;
      }

      return {
        ...state,
        tableStates: {
          ...state.tableStates,
          [elementId]: {
            ...tableState,
            ...updates,
          },
        },
      };
    },
    setLegendVisible: (
      state,
      action: PayloadAction<{ elementId: string; visible: boolean }>,
    ) => {
      const { elementId, visible } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }
      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            legendVisible: visible,
          },
        },
      };
    },
    setLegendPosition: (
      state,
      action: PayloadAction<{ elementId: string; position: 'left' | 'right' }>,
    ) => {
      const { elementId, position } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }
      return {
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            legendPosition: position,
          },
        },
      };
    },
  },
});

// Getters
export const selectedDashboardIndexSelector = (state: RootState): number =>
  state.dashboardState.selectedDashboardIndex;
export const dashboardModeSelector = (state: RootState): DashboardMode =>
  state.dashboardState.mode;
export const dashboardConfigSelector = (
  state: RootState,
): ConfiguredReport & {
  selectedDashboardIndex: number;
  maps: DashboardMapState[];
} => {
  const currentDashboardIndex = state.dashboardState.selectedDashboardIndex;
  const config = getDashboardConfig(currentDashboardIndex);

  return {
    ...config,
    selectedDashboardIndex: currentDashboardIndex,
    maps: state.dashboardState.mapStates,
  };
};
export const dashboardColumnsSelector = (
  state: RootState,
): DashboardElements[][] => {
  const { columns } = state.dashboardState;
  return columns.filter(column => column.length > 0);
};

export const dashboardMapElementsSelector = (
  state: RootState,
): DashboardMapConfig[] => {
  const allMapElements: DashboardMapConfig[] = [];
  state.dashboardState.columns.forEach(column => {
    column.forEach(element => {
      if (element.type === DashboardElementType.MAP) {
        // eslint-disable-next-line fp/no-mutating-methods
        allMapElements.push(element);
      }
    });
  });
  return allMapElements;
};

export const dashboardMapStateSelector =
  (elementId: string) =>
  (state: RootState): DashboardMapState | undefined =>
    state.dashboardState.mapStates[elementId];

export const dashboardSyncEnabledSelector = (state: RootState): boolean =>
  state.dashboardState.syncMapsEnabled;

export const dashboardSharedViewportSelector = (
  state: RootState,
): DashboardState['sharedViewport'] => state.dashboardState.sharedViewport;

export const dashboardOpacitySelector =
  (elementId: string, layerId: string) =>
  (state: RootState): number | undefined =>
    state.dashboardState.mapStates[elementId]?.opacityMap[layerId]?.value;

export const dashboardTableStateSelector =
  (elementId: string) =>
  (state: RootState): DashboardTableState | undefined =>
    state.dashboardState.tableStates[elementId];

// Setters
export const {
  setSelectedDashboard,
  toggleMapSync,
  setSharedViewport,
  setCapturedViewport,
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
  setMapTitle,
  updateTableState,
  setLegendVisible,
  setLegendPosition,
} = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
