import * as MapboxGL from 'mapbox-gl';
import {
  CommonLayerProps,
  DataFieldType,
  LegendDefinitionItem,
  PointDataLayerProps,
} from 'config/types';
import { CircleLayerSpecification } from 'maplibre-gl';
import { legendToStops } from './layer-utils';

export const circleLayout: CircleLayerSpecification['layout'] = {
  visibility: 'visible',
};

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
          ...legend.reduce(
            (acc: string[], legendItem: LegendDefinitionItem) => [
              ...acc,
              legendItem.label as string,
              legendItem.color as string,
            ],
            [],
          ),
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

// TODO: change return type to FillLayerSpecification['paint'];
// We use the legend values from the config to define "intervals".
export const fillPaintData = (
  { opacity, legend, id }: CommonLayerProps,
  property: string = 'data',
  fillPattern?: 'right' | 'left',
): MapboxGL.FillPaint => {
  let fillPaint: MapboxGL.FillPaint = {
    'fill-opacity': opacity || 0.3,
    'fill-color': {
      property,
      stops: legendToStops(legend),
      type: 'interval',
    },
  };
  if (fillPattern) {
    // eslint-disable-next-line fp/no-mutation
    fillPaint = {
      ...fillPaint,
      'fill-pattern': [
        'step',
        ['get', property],
        // start with step 0.
        ...[`fill-pattern-${id}-legend-0`],
        ...legend!.reduce(
          (acc: string[], legendItem: LegendDefinitionItem, index) => [
            ...acc,
            legendItem.value as string,
            `fill-pattern-${id}-legend-${index}` as string,
          ],
          [],
        ),
      ] as MapboxGL.Expression,
    };
  }
  return fillPaint;
};
