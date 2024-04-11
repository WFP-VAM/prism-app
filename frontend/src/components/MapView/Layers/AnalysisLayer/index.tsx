import React from 'react';
import { get } from 'lodash';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { addPopupData } from 'context/tooltipStateSlice';
import {
  analysisResultSelector,
  invertedColorsSelector,
  isAnalysisLayerActiveSelector,
} from 'context/analysisResultStateSlice';
import { legendToStops } from 'components/MapView/Layers/layer-utils';
import {
  AggregationOperations,
  LegendDefinition,
  MapEventWrapFunctionProps,
  units,
} from 'config/types';
import {
  AnalysisResult,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';
import { getRoundedData } from 'utils/data-utils';
import { LayerDefinitions } from 'config/utils';
import { formatIntersectPercentageAttribute } from 'components/MapView/utils';
import { FillLayerSpecification, MapLayerMouseEvent } from 'maplibre-gl';
import {
  findFeature,
  getEvtCoords,
  getLayerMapId,
  useMapCallback,
} from 'utils/map-utils';
import { opacitySelector } from 'context/opacityStateSlice';
import { invertLegendColors } from 'components/MapView/Legends/LegendItemsList';

export const layerId = getLayerMapId('analysis');

const onClick = (analysisData: AnalysisResult | undefined) => ({
  dispatch,
  t,
}: MapEventWrapFunctionProps<undefined>) => (evt: MapLayerMouseEvent) => {
  const coordinates = getEvtCoords(evt);

  if (!analysisData) {
    return;
  }

  const feature = findFeature(layerId, evt);
  if (!feature) {
    return;
  }

  // Statistic Data
  if (analysisData instanceof PolygonAnalysisResult) {
    const stats = JSON.parse(feature.properties['zonal:stat:classes']);
    // keys are the zonal classes like ['60 km/h', 'Uncertainty Cones']
    const keys = Object.keys(stats).filter(key => key !== 'null');
    const popupData = Object.fromEntries(
      keys.map(key => [
        key,
        {
          // we convert the percentage from a number like 0.832 to something that is
          // more intuitive and can fit in the popup better like "83%"
          data: `${Math.round(stats[key].percentage * 100)}%`,
          coordinates,
        },
      ]),
    );
    dispatch(addPopupData(popupData));
  } else {
    const statisticKey = analysisData.statistic;
    const precision =
      analysisData instanceof ExposedPopulationResult ? 0 : undefined;
    const formattedProperties = formatIntersectPercentageAttribute(
      feature.properties,
    );
    dispatch(
      addPopupData({
        [analysisData.getStatTitle(t)]: {
          data: `${getRoundedData(
            formattedProperties[statisticKey],
            t,
            precision,
          )} ${units[statisticKey] || ''}`,
          coordinates,
        },
      }),
    );
    if (statisticKey === AggregationOperations['Area exposed']) {
      dispatch(
        addPopupData({
          [`${analysisData.getHazardLayer().title} (Area exposed in km²)`]: {
            data: `${getRoundedData(
              formattedProperties.stats_intersect_area || null,
              t,
              precision,
            )} ${units.stats_intersect_area}`,
            coordinates,
          },
        }),
      );
    }
  }

  if (analysisData instanceof BaselineLayerResult) {
    const baselineLayer = analysisData.getBaselineLayer();
    if (baselineLayer?.title) {
      dispatch(
        addPopupData({
          [baselineLayer.title]: {
            data: getRoundedData(get(feature, 'properties.data'), t),
            coordinates,
          },
        }),
      );
    }
  }

  if (analysisData instanceof ExposedPopulationResult && analysisData.key) {
    dispatch(
      addPopupData({
        [analysisData.key]: {
          // TODO - consider using a simple safeTranslate here instead.
          data: getRoundedData(
            get(feature, `properties.${analysisData.key}`),
            t,
          ),
          coordinates,
        },
      }),
    );
  }
};

// We use the legend values from the baseline layer
function fillPaintData(
  legend: LegendDefinition,
  property: string,
  opacity: number = 0.3,
): FillLayerSpecification['paint'] {
  return {
    'fill-opacity': opacity,
    'fill-color': {
      property,
      stops: legendToStops(legend),
      type: 'interval',
    },
  };
}

function AnalysisLayer({ before }: { before?: string }) {
  // TODO maybe in the future we can try add this to LayerType so we don't need exclusive code in Legends and MapView to make this display correctly
  // Currently it is quite difficult due to how JSON focused the typing is. We would have to refactor it to also accept layers generated on-the-spot
  const analysisData = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const opacityState = useSelector(opacitySelector('analysis'));
  const invertedColorsForAnalysis = useSelector(invertedColorsSelector);
  useMapCallback('click', layerId, undefined, onClick(analysisData));

  if (!analysisData || !isAnalysisLayerActive) {
    return null;
  }

  const baselineIsBoundary =
    'baselineLayerId' in analysisData &&
    LayerDefinitions[analysisData.baselineLayerId!]?.type === 'boundary';

  const defaultProperty = (() => {
    switch (true) {
      case analysisData instanceof ExposedPopulationResult:
        return analysisData.statistic as string;
      case analysisData instanceof PolygonAnalysisResult:
        return 'zonal:stat:percentage';
      case analysisData instanceof BaselineLayerResult:
        return baselineIsBoundary ? analysisData.statistic : 'data';
      default:
        return 'data';
    }
  })();

  const boundary =
    'boundaryId' in analysisData && analysisData.boundaryId
      ? getLayerMapId(analysisData.boundaryId)
      : before;

  const legend = invertedColorsForAnalysis
    ? invertLegendColors(analysisData.legend)
    : analysisData.legend;

  return (
    <Source data={analysisData.featureCollection} type="geojson">
      <Layer
        id={layerId}
        type="fill"
        beforeId={boundary}
        paint={fillPaintData(legend, defaultProperty, opacityState)}
      />
    </Source>
  );
}

export default AnalysisLayer;
