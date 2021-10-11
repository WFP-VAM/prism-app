import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { AdminLevelDataLayerProps } from '../../../../config/types';
import { legendToStops } from '../layer-utils';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import { formatAdminCode, getFeatureInfo } from '../../utils';

function AdminLevelDataLayers({ layer }: { layer: AdminLevelDataLayerProps }) {
  const layerData = useSelector(layerDataSelector(layer.id)) as
    | LayerData<AdminLevelDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};
  const { features } = data || {};

  useEffect(() => {
    if (!features) {
      dispatch(loadLayerData({ layer }));
    }
  }, [dispatch, features, layer]);

  if (!features) {
    return null;
  }

  // We use the legend values from the config to define "intervals".
  const fillPaintData: MapboxGL.FillPaint = {
    'fill-opacity': layer.opacity || 0.3,
    'fill-color': {
      property: 'data',
      stops: legendToStops(layer.legend),
      type: 'interval',
    },
  };

  return (
    <GeoJSONLayer
      before="boundaries-line"
      id={`layer-${layer.id}`}
      data={features}
      fillPaint={fillPaintData}
      fillOnClick={async (evt: any) => {
        // by default add `data_field` to the tooltip
        dispatch(
          addPopupData({
            [layer.title]: {
              data: get(evt.features[0], 'properties.data', 'No Data'),
              coordinates: evt.lngLat,
            },
          }),
        );
        // then add featured info properties as extra fields to the tooltip
        const fields: { [key: string]: any } = await getFeatureInfo(
          layer,
          evt.features[0].properties,
        );
        Object.keys(fields).forEach((key: string) => {
          dispatch(
            addPopupData({
              [key]: {
                data: fields[key],
                coordinates: evt.lngLat,
              },
            }),
          );
        });
      }}
    />
  );
}

export default AdminLevelDataLayers;
