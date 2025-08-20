import React, { createContext, useMemo } from 'react';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import { DateRange } from 'context/mapStateSlice';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';

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

  const value = useMemo(() => ({ index, actions }), [index, actions]);
  return (
    <MapInstanceContext.Provider value={value}>
      {children}
    </MapInstanceContext.Provider>
  );
}
