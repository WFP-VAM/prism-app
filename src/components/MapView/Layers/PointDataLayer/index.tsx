import React, { useEffect } from 'react';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { useSelector, useDispatch } from 'react-redux';
import { legendToStops } from '../layer-utils';
import { PointDataLayerProps } from '../../../../config/types';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import {
  dateRangeSelector,
  layerDataSelector,
} from '../../../../context/mapStateSlice/selectors';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer }: { layer: PointDataLayerProps }) {
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const layerData = useSelector(layerDataSelector(layer.id, selectedDate)) as
    | LayerData<PointDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};

  useEffect(() => {
    if (!data) {
      dispatch(loadLayerData({ layer, date: selectedDate }));
    }
  }, [data, dispatch, layer, selectedDate]);

  if (!data) {
    return null;
  }

  const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };
  const circlePaint: MapboxGL.CirclePaint = {
    'circle-color': {
      property: layer.measure,
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
              data: get(
                evt.features[0],
                `properties.${layer.measure}`,
                'No Data',
              ),
              coordinates: evt.lngLat,
            },
          }),
        );
      }}
    />
  );
}

export default PointDataLayer;
