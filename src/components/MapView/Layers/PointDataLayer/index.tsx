import React, { useEffect } from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { useDispatch, useSelector } from 'react-redux';
import { legendToStops } from '../layer-utils';
import {
  PointDataLayerProps,
  FeatureInfoObject,
  LabelType,
} from '../../../../config/types';

import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { useDefaultDate } from '../../../../utils/useDefaultDate';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer }: { layer: PointDataLayerProps }) {
  const selectedDate = useDefaultDate(layer.id);

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
    'circle-opacity': layer.opacity || 0.3,
    'circle-color': {
      property: layer.measure,
      stops: legendToStops(layer.legend),
    },
  };

  const defaultProps: FeatureInfoObject = {
    measure: {
      type: LabelType.Number,
      label: layer.title,
    },
  };

  const props = layer.featureInfoProps || defaultProps;

  return (
    <GeoJSONLayer
      before="boundaries-line"
      id={`layer-${layer.id}`}
      data={data}
      circleLayout={circleLayout}
      circlePaint={circlePaint}
      circleOnClick={(evt: any) => {
        const { properties } = evt.features[0];
        const featureInfoKeys = Object.keys(props);

        const popupData = Object.keys(properties)
          .filter(p => featureInfoKeys.includes(p))
          .reduce(
            (obj, item) => ({
              ...obj,
              [props[item].label]: {
                data: properties[item],
                coordinates: evt.lngLat,
              },
            }),
            {},
          );

        dispatch(addPopupData(popupData));
      }}
    />
  );
}

export default PointDataLayer;
