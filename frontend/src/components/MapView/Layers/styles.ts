import * as MapboxGL from 'mapbox-gl';
import {
  CommonLayerProps,
  DataFieldType,
  PointDataLayerProps,
} from '../../../config/types';
import { legendToStops } from './layer-utils';

export const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };

export const circlePaint = ({
  opacity,
  legend,
  dataField,
  dataFieldType,
}: PointDataLayerProps): MapboxGL.CirclePaint => {
  const circleColor =
    dataFieldType === DataFieldType.TEXT
      ? [
          'match',
          ['get', dataField],
          ...legend
            .map(legendItem => [legendItem.label, legendItem.color])
            .reduce((acc, item) => [...acc, ...item]),
          '#CCC',
        ]
      : {
          property: dataField,
          stops: legendToStops(legend),
        };

  return {
    'circle-radius': 8,
    'circle-opacity': opacity || 0.3,
    'circle-color': circleColor as MapboxGL.Expression,
  };
};

// We use the legend values from the config to define "intervals".
export const fillPaintData = (
  { opacity, legend }: CommonLayerProps,
  property: string = 'data',
): MapboxGL.FillPaint => ({
  'fill-opacity': opacity || 0.3,
  'fill-color': {
    property,
    stops: legendToStops(legend),
    type: 'interval',
  },
});
