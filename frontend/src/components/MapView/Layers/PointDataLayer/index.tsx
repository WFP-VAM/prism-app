import React, { useEffect } from 'react';
import moment from 'moment';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FeatureCollection } from 'geojson';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { PointDataLayerProps, PointDataLoader } from '../../../../config/types';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  clearUserAuthGlobal,
  userAuthSelector,
  availableDatesSelector,
} from '../../../../context/serverStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import {
  layerDataSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';
import { removeLayerData } from '../../../../context/mapStateSlice';
import { addNotification } from '../../../../context/notificationStateSlice';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { getFeatureInfoPropsData } from '../../utils';
import { getRoundedData } from '../../../../utils/data-utils';
import { getRequestDate } from '../../../../utils/server-utils';
import { useUrlHistory } from '../../../../utils/url-utils';
import { useSafeTranslation } from '../../../../i18n';
import { circleLayout, circlePaint, fillPaintData } from '../styles';
import {
  setEWSParams,
  clearDataset,
} from '../../../../context/datasetStateSlice';
import { createEWSDatasetParams } from '../../../../utils/ews-utils';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer, before }: LayersProps) {
  const selectedDate = useDefaultDate(layer.id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const userAuth = useSelector(userAuthSelector);

  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  const layerData = useSelector(layerDataSelector(layer.id, queryDate)) as
    | LayerData<PointDataLayerProps>
    | undefined;
  const dispatch = useDispatch();
  const {
    updateHistory,
    removeKeyFromUrl,
    removeLayerFromUrl,
  } = useUrlHistory();

  const map = useSelector(mapSelector);

  const { data } = layerData || {};
  const { features } = data || {};
  const { t } = useSafeTranslation();

  const { id: layerId } = layer;

  useEffect(() => {
    if (layer.authRequired && !userAuth) {
      return;
    }

    if (!features && queryDate) {
      dispatch(loadLayerData({ layer, date: queryDate, userAuth }));
    }
  }, [features, dispatch, userAuth, layer, queryDate, layerAvailableDates]);

  useEffect(() => {
    if (
      features &&
      !(features as FeatureCollection).features &&
      layer.authRequired
    ) {
      dispatch(
        addNotification({
          message: 'Invalid credentials',
          type: 'error',
        }),
      );

      dispatch(removeLayerData(layer));
      dispatch(clearUserAuthGlobal());
      return;
    }

    if (
      features &&
      (features as FeatureCollection).features.length === 0 &&
      layer.authRequired
    ) {
      dispatch(
        addNotification({
          message: `Data not found for provided date: ${moment(
            selectedDate,
          ).format('YYYY-MM-DD')}`,
          type: 'warning',
        }),
      );
    }
  }, [
    features,
    dispatch,
    layer,
    selectedDate,
    userAuth,
    removeKeyFromUrl,
    removeLayerFromUrl,
    updateHistory,
  ]);

  if (!features || map?.getSource(layerId) || !queryDate) {
    return null;
  }

  const onClickFunc = async (evt: any) => {
    const feature = evt.features[0];

    // by default add `dataField` to the tooltip
    dispatch(
      addPopupData({
        [layer.title]: {
          data: getRoundedData(
            get(feature, `properties.${layer.dataField}`),
            t,
          ),
          coordinates: evt.lngLat,
        },
      }),
    );
    // then add feature_info_props as extra fields to the tooltip
    dispatch(
      addPopupData(getFeatureInfoPropsData(layer.featureInfoProps || {}, evt)),
    );

    if (layer.loader === PointDataLoader.EWS) {
      dispatch(clearDataset());

      const ewsDatasetParams = createEWSDatasetParams(
        feature?.properties,
        layer.data,
      );
      dispatch(setEWSParams(ewsDatasetParams));
    }
  };

  if (layer.adminLevelDisplay) {
    return (
      <GeoJSONLayer
        before={before}
        id={layerId}
        data={features}
        fillPaint={fillPaintData(layer, layer.dataField)}
        fillOnClick={onClickFunc}
      />
    );
  }
  return (
    <GeoJSONLayer
      before={before}
      id={layerId}
      data={features}
      circleLayout={circleLayout}
      circlePaint={circlePaint(layer, layer.dataField)}
      circleOnClick={onClickFunc}
    />
  );
}

export interface LayersProps {
  layer: PointDataLayerProps;
  before?: string;
}

export default PointDataLayer;
