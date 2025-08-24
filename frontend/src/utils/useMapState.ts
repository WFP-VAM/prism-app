import { useContext, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import {
  DateRange,
  MapState,
  addLayer as addGlobalMapLayer,
  removeLayer as removeGlobalMapLayer,
  updateDateRange as updateGlobalMapDateRange,
  setMap as setGlobalMap,
  removeLayerData as removeGlobalMapLayerData,
  setBoundaryRelationData as setGlobalMapBoundaryRelationData,
} from 'context/mapStateSlice';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { MapInstanceContext } from 'components/MapView/MapInstanceContext';
import {
  layersSelector,
  dateRangeSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';

// Unified interface for both global and instance map state
export interface UnifiedMapState extends MapState {
  actions: {
    addLayer: (layer: LayerType) => void;
    removeLayer: (layer: LayerType) => void;
    updateDateRange: (dateRange: DateRange) => void;
    setMap: (map: () => MaplibreMap | undefined) => void;
    removeLayerData: (layer: LayerType) => void;
    setBoundaryRelationData: (data: BoundaryRelationsDict) => void;
  };
}

export function useMapState(): UnifiedMapState {
  const mapInstanceContext = useContext(MapInstanceContext);
  const dispatch = useDispatch();

  // Getters
  const layers = useSelector(
    mapInstanceContext && mapInstanceContext.selectors.selectLayers
      ? mapInstanceContext.selectors.selectLayers
      : layersSelector,
  );

  const dateRange = useSelector(
    mapInstanceContext && mapInstanceContext.selectors.selectDateRange
      ? mapInstanceContext.selectors.selectDateRange
      : dateRangeSelector,
  );

  const mapGetter = useMemo(
    () =>
      mapInstanceContext && mapInstanceContext.selectors.selectMap
        ? mapInstanceContext.selectors.selectMap
        : mapSelector,
    [mapInstanceContext],
  );

  const actions = useMemo(() => {
    const addLayer =
      mapInstanceContext && mapInstanceContext.actions.addLayer
        ? mapInstanceContext.actions.addLayer
        : (layer: LayerType) => dispatch(addGlobalMapLayer(layer));

    const removeLayer =
      mapInstanceContext && mapInstanceContext.actions.removeLayer
        ? mapInstanceContext.actions.removeLayer
        : (layer: LayerType) => dispatch(removeGlobalMapLayer(layer));

    const updateDateRange =
      mapInstanceContext && mapInstanceContext.actions.updateDateRange
        ? mapInstanceContext.actions.updateDateRange
        : (newDateRange: DateRange) =>
            dispatch(updateGlobalMapDateRange(newDateRange));

    const setMap =
      mapInstanceContext && mapInstanceContext.actions.setMap
        ? mapInstanceContext.actions.setMap
        : (map: () => MaplibreMap | undefined) => dispatch(setGlobalMap(map));

    const removeLayerData =
      mapInstanceContext && mapInstanceContext.actions.removeLayerData
        ? mapInstanceContext.actions.removeLayerData
        : (layer: LayerType) => dispatch(removeGlobalMapLayerData(layer));

    const setBoundaryRelationData =
      mapInstanceContext && mapInstanceContext.actions.setBoundaryRelationData
        ? mapInstanceContext.actions.setBoundaryRelationData
        : (data: BoundaryRelationsDict) =>
            dispatch(setGlobalMapBoundaryRelationData(data));

    return {
      addLayer,
      removeLayer,
      updateDateRange,
      setMap,
      removeLayerData,
      setBoundaryRelationData,
    };
  }, [mapInstanceContext, dispatch]);

  return {
    layers,
    dateRange,
    // TODO: Find out purpose mapLibreMap getter and fix issues
    // @ts-ignore
    maplibreMap: mapGetter,
    actions,
  };
}
