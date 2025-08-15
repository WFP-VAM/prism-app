import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { appConfig } from 'config';
import type { ConfiguredReport, LayerType } from 'config/types';
import { DashboardElementType } from 'config/types';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerDefinitions } from 'config/utils';
import { keepLayer } from 'utils/keep-layer-utils';
import type { RootState } from './store';
import { DateRange } from './mapStateSlice';
import { LayerData } from './layers/layer-data';

type MapGetter = () => MaplibreMap | undefined;

type MapInstanceState = {
  layers: LayerType[];
  dateRange: DateRange;
  maplibreMap: MapGetter;
  layersData: LayerData<any>[];
  errors: string[];
};

export interface DashboardState {
  title: string;
  flexElements: ConfiguredReport['flexElements'];
  maps: MapInstanceState[];
}

const initialState: DashboardState = {
  title: appConfig.configuredReports[0]?.title || 'Dashboard',
  flexElements: appConfig.configuredReports[0]?.flexElements || [],
  maps: [
    {
      layers: [],
      dateRange: {},
      maplibreMap: () => undefined,
      layersData: [],
      errors: [],
    },
  ],
};

export function makeMapSelectors(mapIndex: number) {
  return {
    selectLayers: (state: RootState) =>
      state.dashboardState.maps[mapIndex].layers,
    selectDateRange: (state: RootState) =>
      state.dashboardState.maps[mapIndex].dateRange,
    selectMap: (state: RootState) =>
      state.dashboardState.maps[mapIndex].maplibreMap,
    selectLayerData: (state: RootState) =>
      state.dashboardState.maps[mapIndex].layersData,
  };
}

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState,
  reducers: {
    addLayerToMapInstance: (
      state,
      {
        payload: { index, layer: newLayer },
      }: PayloadAction<{ index: number; layer: LayerType }>,
    ) => {
      const { layers } = state.maps[index];
      const layersToAdd = newLayer?.group?.activateAll
        ? Object.values(LayerDefinitions).filter(l =>
            newLayer?.group?.layers?.map(layer => layer.id).includes(l.id),
          )
        : [newLayer];

      // TODO: something is wrong with the types imported by 'maplibre-gl' in config/types.ts
      //  @ts-ignore
      const filteredLayers = layers.filter(layer => keepLayer(layer, newLayer));

      const newLayers =
        newLayer.type === 'boundary'
          ? [...layersToAdd, ...filteredLayers]
          : [...filteredLayers, ...layersToAdd];

      const dedupedLayers = newLayers.filter(
        (l, i, self) =>
          i === self.findIndex(t => t.id === l.id && t.type === l.type),
      );

      return {
        ...state,
        maps: state.maps.map((map, i) =>
          i === index ? { ...map, layers: dedupedLayers } : map,
        ),
      };
    },
    removeLayerFromMapInstance: (
      state,
      {
        payload: { index, layer },
      }: PayloadAction<{ index: number; layer: LayerType }>,
    ) => {
      const { layers } = state.maps[index];
      const filteredLayers = layers.filter(({ id }) =>
        // Keep layers without group and layers with group from different group.
        layer.group
          ? !layer.group.layers.map(l => l.id).includes(id)
          : id !== layer.id,
      );

      return {
        ...state,
        maps: state.maps.map((map, i) =>
          i === index ? { ...map, layers: filteredLayers } : map,
        ),
      };
    },
    updateMapInstanceDateRange: (
      state,
      {
        payload: { index, dateRange },
      }: PayloadAction<{ index: number; dateRange: DateRange }>,
    ) => ({
      ...state,
      maps: state.maps.map((map, i) =>
        i === index ? { ...map, dateRange } : map,
      ),
    }),
    setMapInstanceMap: (
      state,
      {
        payload: { index, map },
      }: PayloadAction<{ index: number; map: MapGetter }>,
    ) => ({
      ...state,
      maps: state.maps.map((mapInstance, i) =>
        i === index ? { ...mapInstance, maplibreMap: map } : mapInstance,
      ),
    }),
    removeMapInstanceLayerData: (
      state,
      {
        payload: { index, layer },
      }: PayloadAction<{ index: number; layer: LayerType }>,
    ) => {
      const { layersData } = state.maps[index];
      const filteredLayersData = layersData.filter(
        ({ layer: dataLayer }) => dataLayer.id !== layer.id,
      );

      return {
        ...state,
        maps: state.maps.map((map, i) =>
          i === index ? { ...map, layersData: filteredLayersData } : map,
        ),
      };
    },
    setMapInstanceBoundaryRelationData: (
      state,
      { payload: { index, data } }: PayloadAction<{ index: number; data: any }>,
    ) => ({
      ...state,
      maps: state.maps.map((map, i) =>
        i === index ? { ...map, boundaryRelationData: data } : map,
      ),
    }),
    dismissMapInstanceError: (
      state,
      {
        payload: { index, error },
      }: PayloadAction<{ index: number; error: string }>,
    ) => {
      const { errors } = state.maps[index];
      const filteredErrors = errors.filter((msg: string) => msg !== error);

      return {
        ...state,
        maps: state.maps.map((map, i) =>
          i === index ? { ...map, errors: filteredErrors } : map,
        ),
      };
    },
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
  addLayerToMapInstance,
  removeLayerFromMapInstance,
  updateMapInstanceDateRange,
  setMapInstanceMap,
  removeMapInstanceLayerData,
  setMapInstanceBoundaryRelationData,
  dismissMapInstanceError,
  setTitle,
  setTextContent,
} = dashboardStateSlice.actions;

export default dashboardStateSlice.reducer;
