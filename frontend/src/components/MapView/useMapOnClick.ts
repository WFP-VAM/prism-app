import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { useBoundaryData } from 'utils/useBoundaryData';
import {
  addPopupData,
  hidePopup,
  setWMSGetFeatureInfoLoading,
} from 'context/tooltipStateSlice';
import { makeFeatureInfoRequest } from 'utils/server-utils';
import { clearDataset } from 'context/datasetStateSlice';
import { MapLayerMouseEvent } from 'maplibre-gl';
import { MapRef } from 'react-map-gl/maplibre';
import { getFormattedDate } from 'utils/date-utils';
import { getActiveFeatureInfoLayers, getFeatureInfoParams } from './utils';

const useMapOnClick = (boundaryLayerId: string, mapRef: MapRef | null) => {
  const dispatch = useDispatch();
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const { data: boundaryLayerData } = useBoundaryData(
    boundaryLayerId,
    mapRef?.getMap(),
  );

  // TODO: maplibre: fix feature
  const getFeatureInfoLayers = useCallback(
    (features?: any) => getActiveFeatureInfoLayers(features),
    [],
  );

  const dateFromRef = getFormattedDate(selectedDate, 'default');

  const handleAdditionPopupDataForInfoRequest = useCallback(
    (result: { [name: string]: string } | null, lngLat: any) => {
      const notNullResult = result as { [name: string]: string };
      Object.keys(notNullResult).forEach((k: string) => {
        dispatch(
          addPopupData({
            [k]: {
              data: notNullResult[k],
              coordinates: lngLat,
            },
          }),
        );
      });
    },
    [dispatch],
  );

  if (!mapRef) {
    return () => {};
  }

  return (e: MapLayerMouseEvent) => {
    const defaultFunction = (mapEvent: MapLayerMouseEvent) => {
      dispatch(hidePopup());
      dispatch(clearDataset());
      // Hide the alert popup if we click outside the target country (outside boundary bbox)
      const featureInfoLayers = getFeatureInfoLayers(mapEvent.features);
      // Get layers that have getFeatureInfo option.
      if (featureInfoLayers.length !== 0) {
        return;
      }

      const params = getFeatureInfoParams(
        mapRef,
        mapEvent.point,
        dateFromRef as string,
      );

      dispatch(setWMSGetFeatureInfoLoading(true));

      makeFeatureInfoRequest(featureInfoLayers, params, dispatch).then(
        (result: { [name: string]: string } | null) => {
          if (!result) {
            dispatch(setWMSGetFeatureInfoLoading(false));
            return;
          }
          handleAdditionPopupDataForInfoRequest(result, mapEvent.lngLat);
        },
      );
    };

    // this function will only work when boundary data loads.
    // due to how the library works, we can only set this function once,
    // so we should set it when boundary data is present
    if (boundaryLayerData) {
      defaultFunction(e);
    }
  };
};

export default useMapOnClick;
