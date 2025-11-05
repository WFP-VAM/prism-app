import React, { useMemo } from 'react';
import MapInstanceContext, { MapInstanceActions } from './mapInstance.context';
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
