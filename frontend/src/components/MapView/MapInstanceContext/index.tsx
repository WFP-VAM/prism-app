import React, { createContext, useMemo } from 'react';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import { DateRange } from 'context/mapStateSlice';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { RootState } from 'context/store';

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
  // TODO: Replace with actual dispatch calls to map instances
  const actions: MapInstanceActions = useMemo(
    () => ({
      addLayer: () => {},
      removeLayer: () => {},
      updateDateRange: () => {},
      setMap: () => {},
      removeLayerData: () => {},
      setBoundaryRelationData: () => {},
      dismissError: () => {},
    }),
    [],
  );

  const value = useMemo(
    () => ({ index, selectors: {}, actions }),
    [index, actions],
  );
  return (
    <MapInstanceContext.Provider value={value}>
      {children}
    </MapInstanceContext.Provider>
  );
}
