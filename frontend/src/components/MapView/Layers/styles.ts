import {
  CommonLayerProps,
  DataFieldType,
  LegendDefinitionItem,
  PointDataLayerProps,
} from 'config/types';
import {
  CircleLayerSpecification,
  FillLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import { legendToStops } from './layer-utils';

export const circleLayout: CircleLayerSpecification['layout'] = {
  visibility: 'visible',
};

const dataFieldColor = (
  legend: LegendDefinitionItem[],
  dataField: string,
  dataFieldType?: DataFieldType,
) =>
  dataFieldType === DataFieldType.TEXT
    ? [
        'match',
        ['get', dataField],
        ...legend.reduce(
          (acc: string[], legendItem: LegendDefinitionItem) => [
            ...acc,
            (legendItem.value || legendItem.label) as string,
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

export const circlePaint = ({
  opacity,
  legend,
  dataField,
  dataFieldType,
}: PointDataLayerProps): SymbolLayerSpecification['paint'] => {
  const circleColor = dataFieldColor(legend, dataField, dataFieldType);
  return {
    'icon-opacity': opacity || 0.3,
    'icon-color': circleColor as any,
  };
};

export const fillPaintCategorical = ({
  opacity,
  legend,
  dataField,
  dataFieldType,
}: PointDataLayerProps): FillLayerSpecification['paint'] => ({
  'fill-opacity': opacity || 0.5,
  'fill-color': dataFieldColor(legend, dataField, dataFieldType) as any,
});

// We use the legend values from the config to define "intervals".
export const fillPaintData = (
  { opacity, legend, id }: CommonLayerProps,

  property: string = 'data',
  fillPattern?: 'right' | 'left',
): FillLayerSpecification['paint'] => {
  let fillPaint: FillLayerSpecification['paint'] = {
    'fill-opacity': opacity || 0.3,
    'fill-color': {
      property,
      stops: legendToStops(legend),
      type: 'interval',
    },
  };
  if (fillPattern || legend?.some(l => l.fillPattern)) {
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
        // TODO: maplibre: fix any
      ] as any,
    };
  }
  return fillPaint;
};
