import React, { createContext, useMemo } from 'react';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import { DateRange } from 'context/mapStateSlice';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { RootState } from 'context/store';
import { useDispatch } from 'react-redux';
import {
  addLayerToMap,
  removeLayerFromMap,
  updateMapDateRange,
  setMap,
  removeLayerData,
  setBoundaryRelationData,
  dismissError,
} from 'context/dashboardStateSlice';

type MapGetter = () => MaplibreMap | undefined;

export type MapInstanceActions = {
  addLayer: (layer: LayerType) => void;
  removeLayer: (layer: LayerType) => void;
  updateDateRange: (dateRange: DateRange) => void;
  setMap: (mapGetter: MapGetter) => void;
  removeLayerData: (layer: LayerType) => void;
  setBoundaryRelationData: (data: BoundaryRelationsDict) => void;
  dismissError: (error: string) => void;
};

export type MapInstanceSelectors = {
  selectLayers: (state: RootState) => LayerType[];
  selectDateRange: (state: RootState) => DateRange;
  selectMap: (state: RootState) => MapGetter;
};

type MapInstanceContextType = {
  index: number;
  selectors: Partial<MapInstanceSelectors>;
  actions: MapInstanceActions;
};

export const MapInstanceContext = createContext<MapInstanceContextType | null>(
  null,
);

/**
 * MapInstanceProvider wraps individual map instances to provide read/write utils
 * Map children within this provider can then safely manipulate layers and other pieces of state without affecting other maps
 * @param index - Position of map instance in an array of maps (e.g. in a dashboard config)
 * @returns React element that provides map instance context to its children
 */
export function MapInstanceProvider({
  index,
  children,
}: {
  index: number;
  // initial?: Partial<MapState>;
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();
  const actions: MapInstanceActions = useMemo(
    () => ({
      addLayer: (layer: LayerType) => {
        dispatch(addLayerToMap({ index, layer }));
      },
      removeLayer: (layer: LayerType) => {
        dispatch(removeLayerFromMap({ index, layer }));
      },
      updateDateRange: (dateRange: DateRange) => {
        dispatch(updateMapDateRange({ index, dateRange }));
      },
      setMap: (mapGetter: MapGetter) => {
        dispatch(setMap({ index, maplibreMap: mapGetter }));
      },
      removeLayerData: (layer: LayerType) => {
        dispatch(removeLayerData({ index, layer }));
      },
      setBoundaryRelationData: (data: BoundaryRelationsDict) => {
        dispatch(setBoundaryRelationData({ index, data }));
      },
      dismissError: (error: string) => {
        dispatch(dismissError({ index, error }));
      },
    }),
    [dispatch, index],
  );

  const value = useMemo(
    () => ({
      index,
      selectors: {
        selectLayers: (state: RootState) =>
          state.dashboardState.maps[index].layers,
        selectDateRange: (state: RootState) =>
          state.dashboardState.maps[index].dateRange,
        selectMap: (state: RootState) =>
          state.dashboardState.maps[index].maplibreMap,
      },
      actions,
    }),
    [index, actions],
  );
  return (
    <MapInstanceContext.Provider value={value}>
      {children}
    </MapInstanceContext.Provider>
  );
}
