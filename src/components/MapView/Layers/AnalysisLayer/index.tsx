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
import {
  LegendDefinition,
  LayerKey,
  AdminLevelDataLayerProps,
} from '../../../../config/types';
import {
  AdminStatsResult,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from '../../../../utils/analysis-utils';
import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../../config/utils';
import { getRoundedData } from '../../utils';

function AnalysisLayer() {
  // TODO maybe in the future we can try add this to LayerType so we don't need exclusive code in Legends and MapView to make this display correctly
  // Currently it is quite difficult due to how JSON focused the typing is. We would have to refactor it to also accept layers generated on-the-spot
  const analysisData = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  console.log({ analysisData, isAnalysisLayerActive });

  const dispatch = useDispatch();
  const baselineLayerId = get(analysisData, 'baselineLayerId');
  const baselineLayer = LayerDefinitions[
    baselineLayerId as LayerKey
  ] as AdminLevelDataLayerProps;

  if (!analysisData || !isAnalysisLayerActive) {
    return null;
  }

  const boundaryId =
    baselineLayer?.boundary && isAnalysisLayerActive
      ? baselineLayer.boundary
      : getBoundaryLayerSingleton().id;

  let property;
  if (analysisData instanceof ExposedPopulationResult) {
    property = analysisData.statistic as string;
  } else if (analysisData instanceof AdminStatsResult) {
    property = `stats_${analysisData.statistic.toLowerCase()}`;
  } else if (analysisData instanceof PolygonAnalysisResult) {
    property = 'zonal:stat:percentage';
  } else {
    property = 'data';
  }

  // We use the legend values from the baseline layer
  let fillPaint: MapboxGL.FillPaint;
  if (analysisData instanceof PolygonAnalysisResult) {
    fillPaint = {
      'fill-opacity': 0.3,
      'fill-color': {
        property,
        stops: [
          [0, '#FFF'],
          [1, '#F00'],
        ],
        type: 'interval',
      },
    };
  } else {
    fillPaint = {
      'fill-opacity': 0.3,
      'fill-color': {
        property,
        stops: legendToStops(analysisData.legend),
        type: 'interval',
      },
    };
  }

  return (
    <GeoJSONLayer
      id="layer-analysis"
      before={`layer-${boundaryId}-line`}
      data={analysisData.featureCollection}
      fillPaint={fillPaint}
      fillOnClick={(evt: any) => {
        const coordinates = evt.lngLat;

        dispatch(
          addPopupData({
            [analysisData.getStatTitle()]: {
              data: getRoundedData(
                get(evt.features[0], ['properties', analysisData.statistic]),
              ),
              coordinates,
            },
          }),
        );

        if (analysisData instanceof BaselineLayerResult) {
          dispatch(
            addPopupData({
              [analysisData.getBaselineLayer().title]: {
                data: getRoundedData(get(evt.features[0], 'properties.data')),
                coordinates,
              },
            }),
          );
        }

        if (analysisData instanceof ExposedPopulationResult) {
          dispatch(
            addPopupData({
              [analysisData.key]: {
                data: getRoundedData(
                  get(evt.features[0], `properties.${analysisData.key}`),
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
