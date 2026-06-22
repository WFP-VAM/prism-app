import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import type {
  Dashboard,
  DashboardElements,
  DashboardMapConfig,
  DashboardTableConfig,
  LayerType,
} from 'config/types';
import { DashboardElementType, DashboardMode } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { DateRange, MapState } from 'context/mapStateSlice';
import { defaultElementForType } from 'dashboardConfig/defaultElementForType';
import { Map as MaplibreMap } from 'maplibre-gl';
import { keepLayer } from 'utils/keep-layer-utils';
import { getLayerMapId } from 'utils/map-utils';
import { generateSlugFromTitle } from 'utils/string-utils';

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
  useLatestAvailableDate?: boolean;
  /** Fixed date preserved when toggling useLatestAvailableDate on in edit mode. */
  pinnedDate?: number;
}

export interface DashboardTableState {
  maxRows: number;
  sortColumn: string | number;
  sortOrder: 'asc' | 'desc';
}

export interface DashboardState {
  /** Loaded from published dashboard API (see useDashboardConfig). */
  dashboards: Dashboard[];
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

const EMPTY_DASHBOARD_FALLBACK: Dashboard = {
  title: 'Dashboard',
  path: 'dashboard',
  firstColumn: [],
  secondColumn: [],
  thirdColumn: [],
};

/**
 * Resolve dashboard definition by index from the loaded list (matches former appConfig.dashboards behavior).
 */
export function getDashboardConfigFromList(
  index: number,
  dashboards: Dashboard[],
): Dashboard {
  if (!Array.isArray(dashboards) || dashboards.length === 0) {
    return { ...EMPTY_DASHBOARD_FALLBACK };
  }
  const originalConfig = dashboards[index] || dashboards[0];
  const config = { ...originalConfig };
  if (!config.path?.trim()) {
    config.path = generateSlugFromTitle(config.title);
  }
  return config;
}

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
        preSelectedLayers.push(layer);
        const [mapLayerId, opacityType] = getMapLayerOpacityConfig(
          layerId,
          layer.type,
        );

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

  const useLatest = mapConfig.useLatestAvailableDate ?? false;

  return {
    layers: preSelectedLayers,
    dateRange: {
      startDate: useLatest
        ? undefined
        : mapConfig.date
          ? new Date(mapConfig.date).getTime()
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
    useLatestAvailableDate: useLatest,
  };
};

const createTableStateFromConfig = (
  tableConfig: DashboardTableConfig,
): DashboardTableState => ({
  maxRows: tableConfig.maxRows || 10,
  sortColumn: tableConfig.sortColumn || 'name',
  sortOrder: tableConfig.sortOrder || 'asc',
});

const createInitialState = (
  dashboardIndex: number = 0,
  dashboards: Dashboard[] = [],
): DashboardState => {
  const dashboardConfig = getDashboardConfigFromList(
    dashboardIndex,
    dashboards,
  );

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
        mapStates[elementId] = createMapStateFromConfig(element);
      } else if (element.type === DashboardElementType.TABLE) {
        tableStates[elementId] = createTableStateFromConfig(element);
      }
    });
  });

  return {
    dashboards,
    selectedDashboardIndex: dashboardIndex,
    title: dashboardConfig?.title || 'Dashboard',
    mode: dashboardConfig?.isDraft ? DashboardMode.EDIT : DashboardMode.VIEW,
    columns: allColumns,
    mapStates,
    tableStates,
    syncMapsEnabled: false,
    sharedViewport: undefined,
  };
};

const initialState: DashboardState = createInitialState(0, []);

function buildColumnsFromState(
  columns: DashboardElements[][],
  mapStates: { [elementId: string]: DashboardMapState },
  tableStates: { [elementId: string]: DashboardTableState },
): [DashboardElements[], DashboardElements[], DashboardElements[]] {
  return [0, 1, 2].map(colIdx =>
    (columns[colIdx] ?? []).map((element, elemIdx) => {
      const elementId = `${colIdx}-${elemIdx}`;
      if (element.type === DashboardElementType.MAP) {
        const mapState = mapStates[elementId];
        if (!mapState) {
          return element;
        }
        return {
          ...element,
          preSelectedMapLayers: mapState.layers.map(l => ({
            layerId: l.id,
            opacity: mapState.opacityMap[l.id]?.value ?? 1.0,
          })),
          useLatestAvailableDate: mapState.useLatestAvailableDate ?? false,
          date: mapState.useLatestAvailableDate
            ? undefined
            : mapState.dateRange?.startDate !== undefined
              ? new Date(mapState.dateRange.startDate).toISOString()
              : element.date,
          title: mapState.title,
          legendVisible: mapState.legendVisible,
          legendPosition: mapState.legendPosition,
        };
      }
      if (element.type === DashboardElementType.TABLE) {
        const tableState = tableStates[elementId];
        if (!tableState) {
          return element;
        }
        return {
          ...element,
          maxRows: tableState.maxRows,
          sortColumn: tableState.sortColumn,
          sortOrder: tableState.sortOrder,
        };
      }
      return element;
    }),
  ) as [DashboardElements[], DashboardElements[], DashboardElements[]];
}

function remapElementIdForSwapFirstTwoColumns(oldId: string): string {
  const dash = oldId.indexOf('-');
  if (dash <= 0) {
    return oldId;
  }
  const columnIndex = Number.parseInt(oldId.slice(0, dash), 10);
  const remainder = oldId.slice(dash + 1);
  if (columnIndex === 0) {
    return `1-${remainder}`;
  }
  if (columnIndex === 1) {
    return `0-${remainder}`;
  }
  return oldId;
}

function remapStringKeyedStates<T>(
  states: { [elementId: string]: T },
  remapKey: (k: string) => string,
): { [elementId: string]: T } {
  const next: { [elementId: string]: T } = {};
  Object.entries(states).forEach(([id, entry]) => {
    next[remapKey(id)] = entry;
  });
  return next;
}

function remapStatesAfterRemoval<T>(
  states: { [elementId: string]: T },
  columnIndex: number,
  removedElementIndex: number,
): { [elementId: string]: T } {
  const next: { [elementId: string]: T } = {};
  Object.entries(states).forEach(([id, entry]) => {
    const dash = id.indexOf('-');
    const colIdx = Number.parseInt(id.slice(0, dash), 10);
    const elemIdx = Number.parseInt(id.slice(dash + 1), 10);
    if (colIdx !== columnIndex) {
      next[id] = entry;
    } else if (elemIdx < removedElementIndex) {
      next[id] = entry;
    } else if (elemIdx > removedElementIndex) {
      next[`${colIdx}-${elemIdx - 1}`] = entry;
    }
    // elemIdx === removedElementIndex: drop it
  });
  return next;
}

function syncDraftConfig(state: DashboardState): DashboardState {
  const current = state.dashboards[state.selectedDashboardIndex];
  if (!current?.isDraft) {
    return state;
  }
  const [firstColumn, secondColumn, thirdColumn] = buildColumnsFromState(
    state.columns,
    state.mapStates,
    state.tableStates,
  );
  const updated = { ...current, firstColumn, secondColumn, thirdColumn };
  return {
    ...state,
    dashboards: state.dashboards.map((d, i) =>
      i === state.selectedDashboardIndex ? updated : d,
    ),
  };
}

function createEmptyElement(type: DashboardElementType): DashboardElements {
  return defaultElementForType(type);
}

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState,
  reducers: {
    setDashboards: (_state, action: PayloadAction<Dashboard[]>) =>
      createInitialState(0, action.payload),
    setDraftDashboard: (state, action: PayloadAction<Dashboard>) => {
      const draft = { ...action.payload, isDraft: true };
      const dashboards = [...state.dashboards, draft];
      const draftIndex = dashboards.length - 1;
      return {
        ...createInitialState(draftIndex, dashboards),
        mode: DashboardMode.EDIT,
      };
    },
    setSelectedDashboard: (state, action: PayloadAction<number>) => {
      const dashboardIndex = action.payload;
      return createInitialState(dashboardIndex, state.dashboards);
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
    setTitle: (state, action: PayloadAction<string>) => {
      const newTitle = action.payload;
      const newPath = generateSlugFromTitle(newTitle);
      const updatedDashboards = state.dashboards.map((d, i) =>
        i === state.selectedDashboardIndex
          ? { ...d, title: newTitle, path: newPath }
          : d,
      );
      return { ...state, title: newTitle, dashboards: updatedDashboards };
    },
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
      return syncDraftConfig({
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
      });
    },
    setElementType: (
      state,
      action: PayloadAction<{
        columnIndex: number;
        elementIndex: number;
        newType: DashboardElementType;
      }>,
    ) => {
      const { columnIndex, elementIndex, newType } = action.payload;
      const elementId = `${columnIndex}-${elementIndex}`;
      const emptyElement = createEmptyElement(newType);

      const nextMapStates = { ...state.mapStates };
      const nextTableStates = { ...state.tableStates };

      // Remove stale state for the outgoing type
      delete nextMapStates[elementId];
      delete nextTableStates[elementId];

      // Initialize state for the incoming type
      if (newType === DashboardElementType.MAP) {
        nextMapStates[elementId] = createMapStateFromConfig(
          emptyElement as DashboardMapConfig,
        );
      } else if (newType === DashboardElementType.TABLE) {
        nextTableStates[elementId] = createTableStateFromConfig(
          emptyElement as DashboardTableConfig,
        );
      }

      return syncDraftConfig({
        ...state,
        columns: state.columns.map((column, colIdx) =>
          colIdx === columnIndex
            ? column.map((element, elemIdx) =>
                elemIdx === elementIndex ? emptyElement : element,
              )
            : column,
        ),
        mapStates: nextMapStates,
        tableStates: nextTableStates,
      });
    },
    removeElement: (
      state,
      action: PayloadAction<{ columnIndex: number; elementIndex: number }>,
    ) => {
      const { columnIndex, elementIndex } = action.payload;
      return syncDraftConfig({
        ...state,
        columns: state.columns.map((column, colIdx) =>
          colIdx === columnIndex
            ? column.filter((_, elemIdx) => elemIdx !== elementIndex)
            : column,
        ),
        mapStates: remapStatesAfterRemoval(
          state.mapStates,
          columnIndex,
          elementIndex,
        ),
        tableStates: remapStatesAfterRemoval(
          state.tableStates,
          columnIndex,
          elementIndex,
        ),
      });
    },
    removeDashboard: state => {
      const dashboards = state.dashboards.filter(
        (_, i) => i !== state.selectedDashboardIndex,
      );
      return { ...state, dashboards };
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

      return syncDraftConfig({
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            layers: dedupedLayers,
          },
        },
      });
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

      return syncDraftConfig({
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            layers: filteredLayers,
          },
        },
      });
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

      return syncDraftConfig({
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            dateRange,
          },
        },
      });
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

        map.triggerRepaint();
      }

      if (callback !== undefined) {
        callback(value);
      }

      return syncDraftConfig({
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
      });
    },
    setMapTitle: (
      state,
      action: PayloadAction<{ elementId: string; title: string }>,
    ) => {
      const { elementId, title } = action.payload;
      return syncDraftConfig({
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...state.mapStates[elementId],
            title,
          },
        },
      });
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

      return syncDraftConfig({
        ...state,
        tableStates: {
          ...state.tableStates,
          [elementId]: {
            ...tableState,
            ...updates,
          },
        },
      });
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
      return syncDraftConfig({
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            legendVisible: visible,
          },
        },
      });
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
      return syncDraftConfig({
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: {
            ...mapState,
            legendPosition: position,
          },
        },
      });
    },
    swapMapPosition: state => {
      const col0 = state.columns[0] ?? [];
      const col1 = state.columns[1] ?? [];
      const swappedColumns = state.columns.map((col, idx) =>
        idx === 0 ? [...col1] : idx === 1 ? [...col0] : [...(col ?? [])],
      );
      const nextMapStates = remapStringKeyedStates(
        state.mapStates,
        remapElementIdForSwapFirstTwoColumns,
      );
      const nextTableStates = remapStringKeyedStates(
        state.tableStates,
        remapElementIdForSwapFirstTwoColumns,
      );
      return syncDraftConfig({
        ...state,
        columns: swappedColumns,
        mapStates: nextMapStates,
        tableStates: nextTableStates,
      });
    },
    setMapUseLatestDate: (
      state,
      action: PayloadAction<{ elementId: string; value: boolean }>,
    ) => {
      const { elementId, value } = action.payload;
      const mapState = state.mapStates[elementId];
      if (!mapState) {
        return state;
      }

      const nextMapState: DashboardMapState = value
        ? {
            ...mapState,
            useLatestAvailableDate: true,
            pinnedDate: mapState.dateRange?.startDate ?? mapState.pinnedDate,
            dateRange: {},
          }
        : {
            ...mapState,
            useLatestAvailableDate: false,
            dateRange: mapState.pinnedDate
              ? { startDate: mapState.pinnedDate }
              : mapState.dateRange,
            pinnedDate: undefined,
          };

      return syncDraftConfig({
        ...state,
        mapStates: {
          ...state.mapStates,
          [elementId]: nextMapState,
        },
      });
    },
    updateBlockConfig: (
      state,
      action: PayloadAction<{
        columnIndex: number;
        elementIndex: number;
        updates: Partial<DashboardElements>;
      }>,
    ) => {
      const { columnIndex, elementIndex, updates } = action.payload;
      return syncDraftConfig({
        ...state,
        columns: state.columns.map((column, colIdx) =>
          colIdx === columnIndex
            ? column.map((element, elemIdx) =>
                elemIdx === elementIndex
                  ? ({ ...element, ...updates } as DashboardElements)
                  : element,
              )
            : column,
        ),
      });
    },
  },
});

// Getters
export const selectedDashboardIndexSelector = (state: RootState): number =>
  state.dashboardState.selectedDashboardIndex;
export const dashboardModeSelector = (state: RootState): DashboardMode =>
  state.dashboardState.mode;
export const dashboardsListSelector = (state: RootState): Dashboard[] =>
  state.dashboardState.dashboards;

export const areDashboardsAvailableSelector = (state: RootState): boolean =>
  state.dashboardState.dashboards.length > 0;

export const dashboardConfigSelector = (
  state: RootState,
): Dashboard & {
  selectedDashboardIndex: number;
  maps: { [elementId: string]: DashboardMapState };
} => {
  const currentDashboardIndex = state.dashboardState.selectedDashboardIndex;
  const { dashboards } = state.dashboardState;
  const config = getDashboardConfigFromList(currentDashboardIndex, dashboards);

  return {
    ...config,
    title: state.dashboardState.title,
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
  setDashboards,
  setDraftDashboard,
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
  swapMapPosition,
  setElementType,
  removeElement,
  removeDashboard,
  setMapUseLatestDate,
  updateBlockConfig,
} = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
