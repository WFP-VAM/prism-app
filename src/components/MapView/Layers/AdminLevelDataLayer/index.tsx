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
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import { getFeatureInfoPropsData } from '../../utils';

function AdminLevelDataLayers({ layer }: { layer: AdminLevelDataLayerProps }) {
  const selectedDate = useDefaultDate(layer.id);
  const selectedLayerData = selectedDate
    ? layerDataSelector(layer.id, selectedDate)
    : layerDataSelector(layer.id);
  const layerData = useSelector(selectedLayerData) as
    | LayerData<AdminLevelDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};
  const { features } = data || {};

  useEffect(() => {
    if (!features) {
      const loadedLayerData = selectedDate
        ? loadLayerData({ layer, date: selectedDate })
        : loadLayerData({ layer });
      dispatch(loadedLayerData);
    }
  }, [dispatch, features, layer, selectedDate]);

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
        // then add feature_info_props as extra fields to the tooltip
        dispatch(
          addPopupData(
            getFeatureInfoPropsData(layer.featureInfoProps || {}, evt),
          ),
        );
      }}
    />
  );
}

export default AdminLevelDataLayers;
