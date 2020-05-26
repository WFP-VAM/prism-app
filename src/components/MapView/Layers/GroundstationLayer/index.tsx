import React, { useEffect } from 'react';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { useSelector, useDispatch } from 'react-redux';
import { legendToStops } from '../layer-utils';
import { GroundstationLayerProps } from '../../../../config/types';
import { layerDataSelector } from '../../../../context/mapStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';

function onClickCircle(evt: any) {
  // eslint-disable-next-line
  console.log(
    get(evt.features[0], 'properties.index'),
    get(evt.features[0], 'properties.aimagname'),
    get(evt.features[0], 'properties.sumname'),
    get(evt.features[0], 'properties.rasterheight'),
  );
}

function GroundstationLayers({ layer }: { layer: GroundstationLayerProps }) {
  const layerData = useSelector(layerDataSelector(layer.id)) as
    | LayerData<GroundstationLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};

  useEffect(() => {
    if (!data) {
      dispatch(loadLayerData({ layer }));
    }
  }, [data, dispatch, layer]);

  if (!data) {
    return null;
  }

  const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };
  const circlePaint: MapboxGL.CirclePaint = {
    'circle-color': {
      property: 'rasterheight',
      stops: legendToStops(layer.legend),
    },
  };

  return (
    <GeoJSONLayer
      data={data}
      circleLayout={circleLayout}
      circlePaint={circlePaint}
      circleOnClick={onClickCircle}
    />
  );
}

export default GroundstationLayers;
