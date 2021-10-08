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
        const code = formatAdminCode(layer, evt.features[0].properties);
        const adminCode = get(evt.features[0].properties, code, 'No Data');
        console.log('--> ', adminCode);
        console.log('--> ', evt.features[0].properties);
        const fields: { [key: string]: any } = await getFeatureInfo(
          layer,
          adminCode,
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
