import React from 'react';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { useDispatch, useSelector } from 'react-redux';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../../context/analysisResultStateSlice';
import { legendToStops } from '../layer-utils';
import { LegendDefinition } from '../../../../config/types';
import {
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from '../../../../utils/analysis-utils';
import { getRoundedData } from '../../../../utils/data-utils';
import { useSafeTranslation } from '../../../../i18n';
import { LayerDefinitions } from '../../../../config/utils';

function AnalysisLayer({ before }: { before?: string }) {
  // TODO maybe in the future we can try add this to LayerType so we don't need exclusive code in Legends and MapView to make this display correctly
  // Currently it is quite difficult due to how JSON focused the typing is. We would have to refactor it to also accept layers generated on-the-spot
  const analysisData = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const { t } = useSafeTranslation();

  const dispatch = useDispatch();

  if (!analysisData || !isAnalysisLayerActive) {
    return null;
  }

  // We use the legend values from the baseline layer
  function fillPaintData(
    legend: LegendDefinition,
    property: string,
  ): MapboxGL.FillPaint {
    return {
      'fill-opacity': 0.3,
      'fill-color': {
        property,
        stops: legendToStops(legend),
        type: 'interval',
      },
    };
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
      ? `layer-${analysisData.boundaryId}-line`
      : before;

  return (
    <GeoJSONLayer
      id="layer-analysis"
      before={boundary}
      data={analysisData.featureCollection}
      fillPaint={fillPaintData(analysisData.legend, defaultProperty)}
      // TODO - simplify and cleanup the fillOnClick logic between stat data and baseline data
      fillOnClick={(evt: any) => {
        const coordinates = evt.lngLat;

        // Statistic Data
        if (analysisData instanceof PolygonAnalysisResult) {
          const stats = JSON.parse(
            evt.features[0].properties['zonal:stat:classes'],
          );
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
          dispatch(
            addPopupData({
              [analysisData.getStatTitle(t)]: {
                data: getRoundedData(
                  get(evt.features[0], ['properties', statisticKey]),
                  t,
                ),
                coordinates,
              },
            }),
          );
        }

        if (analysisData instanceof BaselineLayerResult) {
          const baselineLayer = analysisData.getBaselineLayer();
          if (baselineLayer?.title) {
            dispatch(
              addPopupData({
                [baselineLayer.title]: {
                  data: getRoundedData(
                    get(evt.features[0], 'properties.data'),
                    t,
                  ),
                  coordinates,
                },
              }),
            );
          }
        }

        if (
          analysisData instanceof ExposedPopulationResult &&
          analysisData.key
        ) {
          dispatch(
            addPopupData({
              [analysisData.key]: {
                // TODO - consider using a simple safeTranslate here instead.
                data: getRoundedData(
                  get(evt.features[0], `properties.${analysisData.key}`),
                  t,
                ),
                coordinates,
              },
            }),
          );
        }
      }}
    />
  );
}

export default AnalysisLayer;
