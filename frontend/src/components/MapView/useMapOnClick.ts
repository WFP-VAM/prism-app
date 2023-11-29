import { useDispatch, useSelector } from 'react-redux';
import { Map } from 'mapbox-gl';
import inside from '@turf/boolean-point-in-polygon';
import { Feature, MultiPolygon } from '@turf/helpers';
import moment from 'moment';
import { useCallback, useMemo } from 'react';
import {
  dateRangeSelector,
  layerDataSelector,
} from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { BoundaryLayerProps } from 'config/types';
import {
  addPopupData,
  hidePopup,
  setWMSGetFeatureInfoLoading,
} from 'context/tooltipStateSlice';
import { DEFAULT_DATE_FORMAT } from 'utils/name-utils';
import { makeFeatureInfoRequest } from 'utils/server-utils';
import { clearDataset } from 'context/datasetStateSlice';
import { getActiveFeatureInfoLayers, getFeatureInfoParams } from './utils';

const useMapOnClick = (
  setIsAlertFormOpen: (value: boolean) => void,
  boundaryLayerId: string,
) => {
  const dispatch = useDispatch();
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayerId)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  // Whether the boundary layer data are outside of boundary bbox
  const boundaryLayerDataAreOutsideOfBoundaryBBox = useCallback(
    (lng: any, lat: any) => {
      return boundaryLayerData?.data.features.every(
        feature => !inside([lng, lat], feature as Feature<MultiPolygon>),
      );
    },
    [boundaryLayerData],
  );

  // Hide the alert popup if we click outside the target country (outside boundary bbox)
  const onClickOutsideTargetCountry = useCallback(
    (evt: any) => {
      if (
        !boundaryLayerDataAreOutsideOfBoundaryBBox(
          evt.lngLat.lng,
          evt.lngLat.lat,
        )
      ) {
        return;
      }
      setIsAlertFormOpen(false);
    },
    [boundaryLayerDataAreOutsideOfBoundaryBBox, setIsAlertFormOpen],
  );

  const getFeatureInfoLayers = useCallback((map: Map) => {
    return getActiveFeatureInfoLayers(map);
  }, []);

  const dateFromRef = useMemo(() => {
    return moment(selectedDate).format(DEFAULT_DATE_FORMAT);
  }, [selectedDate]);

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

  return (
    // this function will only work when boundary data loads.
    // due to how the library works, we can only set this function once,
    // so we should set it when boundary data is present
    boundaryLayerData &&
    ((map: Map, evt: any) => {
      dispatch(hidePopup());
      dispatch(clearDataset());
      // Hide the alert popup if we click outside the target country (outside boundary bbox)
      onClickOutsideTargetCountry(evt);
      const featureInfoLayers = getFeatureInfoLayers(map);
      // Get layers that have getFeatureInfo option.
      if (featureInfoLayers.length !== 0) {
        return;
      }

      const params = getFeatureInfoParams(map, evt, dateFromRef);

      dispatch(setWMSGetFeatureInfoLoading(true));

      makeFeatureInfoRequest(featureInfoLayers, params, dispatch).then(
        (result: { [name: string]: string } | null) => {
          if (!result) {
            dispatch(setWMSGetFeatureInfoLoading(false));
            return;
          }
          handleAdditionPopupDataForInfoRequest(result, evt.lngLat);
        },
      );
    })
  );
};

export default useMapOnClick;
