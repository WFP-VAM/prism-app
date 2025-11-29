import React, { useMemo } from 'react';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import { DateRange } from 'context/mapStateSlice';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { RootState } from 'context/store';
import { useDispatch } from 'context/hooks';
import {
  addLayerToMap,
  removeLayerFromMap,
  updateMapDateRange,
  setMap,
  removeLayerData,
  setBoundaryRelationData,
  dismissError,
  setDashboardOpacity,
  dashboardOpacitySelector,
  dashboardMapStateSelector,
  setMapTitle,
} from 'context/dashboardStateSlice';
import MapInstanceContext, { MapInstanceActions } from './mapInstance.context';

type MapGetter = () => MaplibreMap | undefined;

interface SetOpacityParams {
  map: MaplibreMap | undefined;
  layerId: LayerType['id'] | undefined;
  layerType: LayerType['type'] | 'analysis' | undefined;
  value: number;
  callback?: (v: number) => void;
}

export type MapInstanceSelectors = {
  selectLayers: (state: RootState) => LayerType[];
  selectDateRange: (state: RootState) => DateRange;
  selectMap: (state: RootState) => MapGetter;
  selectOpacity: (layerId: string) => (state: RootState) => number | undefined;
  selectMinMapBounds: (state: RootState) => number[] | undefined;
  selectCapturedViewport: (
    state: RootState,
  ) => [number, number, number, number] | undefined;
  selectMapTitle: (state: RootState) => string | undefined;
};

/**
 * MapInstanceProvider wraps individual map instances to provide read/write utils
 * Map children within this provider can then safely manipulate layers and other pieces of state without affecting other maps
 * @param elementId - Unique identifier for the map element (e.g. "0-1" for column 0, element 1)
 * @returns React element that provides map instance context to its children
 */
export function MapInstanceProvider({
  elementId,
  children,
}: {
  elementId: string;
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();
  const actions: MapInstanceActions = useMemo(
    () => ({
      addLayer: (layer: LayerType) => {
        dispatch(addLayerToMap({ elementId, layer }));
      },
      removeLayer: (layer: LayerType) => {
        dispatch(removeLayerFromMap({ elementId, layer }));
      },
      updateDateRange: (dateRange: DateRange) => {
        dispatch(updateMapDateRange({ elementId, dateRange }));
      },
      setMap: (mapGetter: MapGetter) => {
        dispatch(setMap({ elementId, maplibreMap: mapGetter }));
      },
      removeLayerData: (layer: LayerType) => {
        dispatch(removeLayerData({ elementId, layer }));
      },
      setBoundaryRelationData: (data: BoundaryRelationsDict) => {
        dispatch(setBoundaryRelationData({ elementId, data }));
      },
      dismissError: (error: string) => {
        dispatch(dismissError({ elementId, error }));
      },
      setOpacity: (params: SetOpacityParams) => {
        dispatch(setDashboardOpacity({ elementId, ...params }));
      },
      updateMapTitle: (title: string) => {
        dispatch(setMapTitle({ elementId, title }));
      },
    }),
    [dispatch, elementId],
  );

  const value = useMemo(
    () => ({
      elementId,
      selectors: {
        selectLayers: (state: RootState) =>
          dashboardMapStateSelector(elementId)(state)?.layers || [],
        selectDateRange: (state: RootState) =>
          dashboardMapStateSelector(elementId)(state)?.dateRange || {},
        selectMap: (state: RootState) =>
          dashboardMapStateSelector(elementId)(state)?.maplibreMap ||
          (() => undefined),
        selectOpacity: (layerId: string) =>
          dashboardOpacitySelector(elementId, layerId),
        selectMinMapBounds: (state: RootState) =>
          dashboardMapStateSelector(elementId)(state)?.minMapBounds || [],
        selectCapturedViewport: (state: RootState) =>
          dashboardMapStateSelector(elementId)(state)?.capturedViewport,
        selectMapTitle: (state: RootState) =>
          dashboardMapStateSelector(elementId)(state)?.title,
      },
      actions,
    }),
    [elementId, actions],
  );
  return (
    <MapInstanceContext.Provider value={value}>
      {children}
    </MapInstanceContext.Provider>
  );
}
