import React, { useEffect } from 'react';
import moment from 'moment';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FeatureCollection } from 'geojson';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { PointDataLayerProps, PointDataLoader } from '../../../../config/types';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  jwtAccessTokenSelector,
  clearJwtAccessToken,
} from '../../../../context/serverStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import {
  layerDataSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';
import {
  removeLayerData,
  removeLayer,
} from '../../../../context/mapStateSlice';
import { addNotification } from '../../../../context/notificationStateSlice';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { getFeatureInfoPropsData } from '../../utils';
import { getBoundaryLayerSingleton } from '../../../../config/utils';
import { getRoundedData } from '../../../../utils/data-utils';
import { useUrlHistory, getUrlKey } from '../../../../utils/url-utils';

import { useSafeTranslation } from '../../../../i18n';
import { circleLayout, circlePaint, fillPaintData } from '../styles';
import {
  setEWSParams,
  clearDataset,
} from '../../../../context/datasetStateSlice';
import { createEWSDatasetParams } from '../../../../utils/ews-utils';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer }: { layer: PointDataLayerProps }) {
  const selectedDate = useDefaultDate(layer.id);
  const jwtAccessToken = useSelector(jwtAccessTokenSelector);

  const layerData = useSelector(layerDataSelector(layer.id, selectedDate)) as
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
    if (
      !features &&
      ((layer.tokenRequired && jwtAccessToken) || !layer.tokenRequired)
    ) {
      dispatch(loadLayerData({ layer, date: selectedDate, jwtAccessToken }));
    }

    if (
      features &&
      !(features as FeatureCollection).features &&
      layer.tokenRequired
    ) {
      dispatch(
        addNotification({
          message: 'Invalid credentials',
          type: 'error',
        }),
      );

      dispatch(removeLayerData(layer));
      dispatch(clearJwtAccessToken());
      return;
    }

    if (
      features &&
      (features as FeatureCollection).features.length === 0 &&
      layer.tokenRequired
    ) {
      dispatch(
        addNotification({
          message: `Data not found for provided date: ${moment(
            selectedDate,
          ).format('YYYY-MM-DD')}`,
          type: 'warning',
        }),
      );

      dispatch(removeLayerData(layer));
      dispatch(clearJwtAccessToken());

      // Remove layer from url.
      const urlLayerKey = getUrlKey(layer);

      const updatedUrl = removeLayerFromUrl(urlLayerKey, layer.id);

      if (updatedUrl === '') {
        removeKeyFromUrl(urlLayerKey);
      } else {
        updateHistory(urlLayerKey, updatedUrl);
      }

      dispatch(removeLayer(layer));
    }
  }, [
    features,
    dispatch,
    layer,
    selectedDate,
    jwtAccessToken,
    removeKeyFromUrl,
    removeLayerFromUrl,
    updateHistory,
  ]);

  if (!features || map?.getSource(layerId)) {
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

    if (layer.loader === PointDataLoader.EWS && selectedDate) {
      dispatch(clearDataset());

      const ewsDatasetParams = createEWSDatasetParams(
        feature?.properties,
        layer.data,
      );
      dispatch(setEWSParams(ewsDatasetParams));
    }
  };

  const boundaryId = getBoundaryLayerSingleton().id;

  if (layer.adminLevelDisplay) {
    return (
      <GeoJSONLayer
        before={`layer-${boundaryId}-line`}
        id={layerId}
        data={features}
        fillPaint={fillPaintData(layer, layer.dataField)}
        fillOnClick={onClickFunc}
      />
    );
  }
  return (
    <GeoJSONLayer
      before={`layer-${boundaryId}-line`}
      id={layerId}
      data={features}
      circleLayout={circleLayout}
      circlePaint={circlePaint(layer, layer.dataField)}
      circleOnClick={onClickFunc}
    />
  );
}

export default PointDataLayer;
