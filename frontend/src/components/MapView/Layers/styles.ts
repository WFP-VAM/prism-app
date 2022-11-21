import * as MapboxGL from 'mapbox-gl';
import { CommonLayerProps } from '../../../config/types';
import { legendToStops } from './layer-utils';

export const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };
export const circlePaint = (
  { opacity, legend }: CommonLayerProps,
  property: string = 'data',
): MapboxGL.CirclePaint => ({
  'circle-radius': 8,
  'circle-opacity': opacity || 0.3,
  'circle-color': {
    property,
    stops: legendToStops(legend),
  },
});

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
