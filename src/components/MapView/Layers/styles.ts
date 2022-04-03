import * as MapboxGL from 'mapbox-gl';
import { CommonLayerProps, PointDataLayerProps } from '../../../config/types';
import { legendToStops } from './layer-utils';

export const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };
export const circlePaint = ({
  opacity,
  dataField,
  legend,
}: PointDataLayerProps): MapboxGL.CirclePaint => ({
  'circle-opacity': opacity || 0.3,
  'circle-color': {
    property: dataField,
    stops: legendToStops(legend),
  },
});

// We use the legend values from the config to define "intervals".
export const fillPaintData = (
  { opacity, legend }: CommonLayerProps,
  property?: string,
): MapboxGL.FillPaint => ({
  'fill-opacity': opacity || 0.3,
  'fill-color': {
    property: property || 'data',
    stops: legendToStops(legend),
    type: 'interval',
  },
});
