import React, { createContext, useContext, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import { DateRange } from 'context/mapStateSlice';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import {
  addLayerToMapInstance,
  dismissMapInstanceError,
  makeMapSelectors,
  removeLayerFromMapInstance,
  removeMapInstanceLayerData,
  setMapInstanceBoundaryRelationData,
  setMapInstanceMap,
  updateMapInstanceDateRange,
} from 'context/dashboardStateSlice';

// Type for map instance selectors
// export type MapInstanceSelectors = {
//   selectLayers: (state: any) => LayerType[];
//   selectDateRange: (state: any) => DateRange;
//   selectMap: (state: any) => MaplibreMap | undefined;
//   selectLayerData: (layerId: LayerKey, date?: number) => (state: any) => any;
//   selectLoadingLayerIds: (state: any) => LayerKey[];
//   selectErrors: (state: any) => string[];
// };

// Type for map instance actions
export type MapInstanceActions = {
  addLayer: (layer: LayerType) => void;
  removeLayer: (layer: LayerType) => void;
  updateDateRange: (dateRange: DateRange) => void;
  setMap: (map: () => MaplibreMap | undefined) => void;
  removeLayerData: (layer: LayerType) => void;
  setBoundaryRelationData: (data: BoundaryRelationsDict) => void;
  dismissError: (error: string) => void;
};

type MapInstanceContextType = {
  index: number;
  selectors: ReturnType<typeof makeMapSelectors>;
  actions: MapInstanceActions;
};

const MapInstanceContext = createContext<MapInstanceContextType | null>(null);

export function MapInstanceProvider({
  index,
  children,
}: {
  index: number;
  //   initial?: Partial<MapState>;
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();
  const selectors = useMemo(() => makeMapSelectors(index), [index]);

  const actions = useMemo(
    () => ({
      addLayer: (layer: LayerType) => {
        dispatch(addLayerToMapInstance({ index, layer }));
      },
      removeLayer: (layer: LayerType) =>
        dispatch(removeLayerFromMapInstance({ index, layer })),
      updateDateRange: (dateRange: DateRange) =>
        dispatch(updateMapInstanceDateRange({ index, dateRange })),
      setMap: (map: () => MaplibreMap | undefined) =>
        dispatch(setMapInstanceMap({ index, map })),
      removeLayerData: (layer: LayerType) =>
        dispatch(removeMapInstanceLayerData({ index, layer })),
      setBoundaryRelationData: (data: any) =>
        dispatch(setMapInstanceBoundaryRelationData({ index, data })),
      dismissError: (error: string) =>
        dispatch(dismissMapInstanceError({ index, error })),
    }),
    [dispatch, index],
  );

  const value = useMemo(
    () => ({ index, selectors, actions }),
    [index, selectors, actions],
  );
  return (
    <MapInstanceContext.Provider value={value}>
      {children}
    </MapInstanceContext.Provider>
  );
}

// Hooks for children
export function useMapInstance() {
  const context = useContext(MapInstanceContext);
  if (!context) {
    throw new Error('useMapInstance must be used within a MapInstanceProvider');
  }
  return context;
}

export function useMapInstanceSelectors() {
  return useMapInstance().selectors;
}

export function useMapInstanceActions() {
  return useMapInstance().actions;
}

export function useMapInstanceId() {
  return useMapInstance().index;
}
