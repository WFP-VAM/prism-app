import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { NSOLayerProps } from '../../../../config/types';
import { legendToStops } from '../layer-utils';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice';

// Get admin data to process.
function getAdminData(evt: any) {
  // eslint-disable-next-line
  console.log(
    get(evt.features[0], 'properties.ADM1_EN'),
    get(evt.features[0], 'properties.ADM2_EN'),
    get(evt.features[0], 'properties.ADM2_PCODE'),
    get(evt.features[0], 'properties.data'),
  );
}

function NSOLayers({ layer }: { layer: NSOLayerProps }) {
  const layerData = useSelector(layerDataSelector(layer.id)) as
    | LayerData<NSOLayerProps>
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
    },
  };

  return (
    <GeoJSONLayer
      data={features}
      fillPaint={fillPaintData}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
      }}
    />
  );
}

export default NSOLayers;
