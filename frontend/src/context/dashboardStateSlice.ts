import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import type { ConfiguredReport, LayerType } from 'config/types';
import { DashboardElementType } from 'config/types';
import { Map as MaplibreMap } from 'maplibre-gl';
import { MapState, DateRange } from 'context/mapStateSlice';
import { LayerDefinitions } from 'config/utils';
import { keepLayer } from 'utils/keep-layer-utils';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import type { RootState } from './store';

type MapGetter = () => MaplibreMap | undefined;

export interface DashboardState {
  title: string;
  flexElements: ConfiguredReport['flexElements'];
  maps: MapState[];
}

const initialState: DashboardState = {
  title: appConfig.configuredReports[0]?.title || 'Dashboard',
  flexElements: appConfig.configuredReports[0]?.flexElements || [],
  maps: [
    {
      layers: [],
      dateRange: {},
      maplibreMap: () => undefined,
      errors: [],
      layersData: [],
      loadingLayerIds: [],
      boundaryRelationData: {},
    },
  ],
};

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState,
  reducers: {
    setTitle: (state, action: PayloadAction<string>) => ({
      ...state,
      title: action.payload,
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
            layer?.group?.layers?.map(layer => layer.id).includes(l.id),
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
        (l, index, self) =>
          index === self.findIndex(t => t.id === l.id && t.type === l.type),
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
      console.log('updateMapDateRange', {
        index,
        dateRange,
        currentState: state.maps[index].dateRange,
      });
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
  },
});

// Getters
export const dashboardTitleSelector = (state: RootState): string =>
  state.dashboardState.title;

export const dashboardFlexElementsSelector = (
  state: RootState,
): ConfiguredReport['flexElements'] => state.dashboardState.flexElements;

// Setters
export const {
  addLayerToMap,
  removeLayerFromMap,
  setTitle,
  setTextContent,
  updateMapDateRange,
  setMap,
  removeLayerData,
  setBoundaryRelationData,
  dismissError,
} = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
