import React, { memo, useEffect } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { FeatureCollection } from 'geojson';
import { useDispatch, useSelector } from 'react-redux';
import {
  MapEventWrapFunctionProps,
  PointDataLayerProps,
  PointDataLoader,
} from 'config/types';
import {
  clearUserAuthGlobal,
  userAuthSelector,
  availableDatesSelector,
} from 'context/serverStateSlice';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { removeLayerData } from 'context/mapStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getRequestDate } from 'utils/server-utils';
import { useUrlHistory } from 'utils/url-utils';
import {
  circleLayout,
  circlePaint,
  fillPaintData,
} from 'components/MapView/Layers/styles';
import { setEWSParams, clearDataset } from 'context/datasetStateSlice';
import { createEWSDatasetParams } from 'utils/ews-utils';
import { addPopupParams } from 'components/MapView/Layers/layer-utils';
import {
  CircleLayerSpecification,
  FillLayerSpecification,
  MapLayerMouseEvent,
} from 'maplibre-gl';
import { findFeature, getLayerMapId, useMapCallback } from 'utils/map-utils';
import { getFormattedDate } from 'utils/date-utils';

const onClick = ({
  layer,
  dispatch,
  t,
}: MapEventWrapFunctionProps<PointDataLayerProps>) => (
  evt: MapLayerMouseEvent,
) => {
  addPopupParams(layer, dispatch, evt, t, false);

  const layerId = getLayerMapId(layer.id);
  const feature = findFeature(layerId, evt);
  if (layer.loader === PointDataLoader.EWS) {
    dispatch(clearDataset());
    if (!feature?.properties) {
      return;
    }
    const ewsDatasetParams = createEWSDatasetParams(
      feature?.properties,
      layer.data,
    );
    dispatch(setEWSParams(ewsDatasetParams));
  }
};

// Point Data, takes any GeoJSON of points and shows it.
const PointDataLayer = ({ layer, before }: LayersProps) => {
  const layerId = getLayerMapId(layer.id);

  const selectedDate = useDefaultDate(layer.id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const userAuth = useSelector(userAuthSelector);

  useMapCallback('click', layerId, layer, onClick);

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

  const { data } = layerData || {};
  const { features } = data || {};

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
          message: `Data not found for provided date: ${getFormattedDate(
            selectedDate,
            'default',
          )}`,
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

  if (!features || !queryDate) {
    return null;
  }

  if (layer.adminLevelDisplay) {
    return (
      <Source data={features} type="geojson">
        <Layer
          id={layerId}
          type="fill"
          paint={
            fillPaintData(
              layer,
              layer.dataField,
            ) as FillLayerSpecification['paint']
          }
        />
      </Source>
    );
  }

  return (
    <Source data={features} type="geojson">
      <Layer
        id={layerId}
        type="circle"
        layout={circleLayout}
        paint={circlePaint(layer) as CircleLayerSpecification['paint']}
      />
    </Source>
  );
};

export interface LayersProps {
  layer: PointDataLayerProps;
  before?: string;
}

export default memo(PointDataLayer);
