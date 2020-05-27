import React, { useEffect } from 'react';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { useSelector, useDispatch } from 'react-redux';
import { legendToStops } from '../layer-utils';
import { GroundstationLayerProps } from '../../../../config/types';
import { layerDataSelector } from '../../../../context/mapStateSlice';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';

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
      property: 'ttt_aver',
      stops: legendToStops(layer.legend),
    },
  };

  return (
    <GeoJSONLayer
      below="boundaries"
      data={data}
      circleLayout={circleLayout}
      circlePaint={circlePaint}
      circleOnClick={(evt: any) => {
        dispatch(
          addPopupData({
            [layer.title]: {
              data: get(evt.features[0], 'properties.ttt_aver', 'No Data'),
              coordinates: evt.lngLat,
            },
          }),
        );
      }}
    />
  );
}

export default GroundstationLayers;
