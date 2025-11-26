import { useContext, useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
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
import MapInstanceContext from 'components/MapView/MapInstanceContext/mapInstance.context';
import {
  layersSelector,
  dateRangeSelector,
} from 'context/mapStateSlice/selectors';

type MapGetter = () => MaplibreMap | undefined;

// Unified interface for both global and instance map state
export interface UnifiedMapState extends MapState {
  actions: {
    addLayer: (layer: LayerType) => void;
    removeLayer: (layer: LayerType) => void;
    updateDateRange: (dateRange: DateRange) => void;
    setMap: (mapGetter: MapGetter) => void;
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
    // compare the names of active layers, as individual layer objects
    // do not change over time, to save some useless rendering
    (a, c) =>
      shallowEqual(
        a.map(o => o.id),
        c.map(o => o.id),
      ),
  );

  const dateRange = useSelector(
    mapInstanceContext && mapInstanceContext.selectors.selectDateRange
      ? mapInstanceContext.selectors.selectDateRange
      : dateRangeSelector,
  );

  // Get the MapGetter from Redux or instance context, then call it to get the map
  const mapGetter = useSelector(
    mapInstanceContext && mapInstanceContext.selectors.selectMap
      ? mapInstanceContext.selectors.selectMap
      : (state: any) => state.mapState.maplibreMap,
  );

  const maplibreMap = mapGetter;

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
        : (map: MapGetter) => dispatch(setGlobalMap(map));

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
    maplibreMap,
    actions,
    errors: [],
    layersData: [],
    loadingLayerIds: [],
    boundaryRelationData: {},
  };
}
