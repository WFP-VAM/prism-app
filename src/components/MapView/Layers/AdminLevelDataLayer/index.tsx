import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { AdminLevelDataLayerProps, LayerKey } from '../../../../config/types';
import { legendToStops } from '../layer-utils';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { addLayer, removeLayer } from '../../../../context/mapStateSlice';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import { getFeatureInfoPropsData } from '../../utils';
import { getBoundaryLayers, LayerDefinitions } from '../../../../config/utils';
import { addNotification } from '../../../../context/notificationStateSlice';

function AdminLevelDataLayers({ layer }: { layer: AdminLevelDataLayerProps }) {
  const layerData = useSelector(layerDataSelector(layer.id)) as
    | LayerData<AdminLevelDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};
  const { features } = data || {};

  useEffect(() => {
    // before loading layer check if it has unique boundary?
    if ('boundary' in layer) {
      const boundaryId = layer.boundary || '';
      if (Object.keys(LayerDefinitions).includes(boundaryId)) {
        const boundaryLayers = getBoundaryLayers();
        boundaryLayers.map(l => dispatch(removeLayer(l)));

        const uniqueBoundaryLayer = LayerDefinitions[boundaryId as LayerKey];
        dispatch(addLayer(uniqueBoundaryLayer));
      } else {
        dispatch(
          addNotification({
            message: `Invalid unique boundary: ${boundaryId} for ${layer.id}`,
            type: 'error',
          }),
        );
      }
    }

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
