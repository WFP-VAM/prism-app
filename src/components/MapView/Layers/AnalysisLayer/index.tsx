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
} from '../../../../utils/analysis-utils';

function AnalysisLayer() {
  // TODO maybe in the future we can try add this to LayerType so we don't need exclusive code in Legends and MapView to make this display correctly
  // Currently it is quite difficult due to how JSON focused the typing is. We would have to refactor it to also accept layers generated on-the-spot
  const analysisData = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);

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

  const property =
    analysisData instanceof ExposedPopulationResult
      ? (analysisData.statistic as string)
      : 'data';

  return (
    <GeoJSONLayer
      id="layer-analysis"
      below="boundaries"
      data={analysisData.featureCollection}
      fillPaint={fillPaintData(analysisData.legend, property)}
      fillOnClick={(evt: any) => {
        const coordinates = evt.lngLat;

        dispatch(
          addPopupData({
            [analysisData.getStatTitle()]: {
              data: Math.round(
                get(
                  evt.features[0],
                  ['properties', analysisData.statistic],
                  'No Data',
                ),
              ).toLocaleString('en-US'),
              coordinates,
            },
          }),
        );

        if (analysisData instanceof BaselineLayerResult) {
          dispatch(
            addPopupData({
              [analysisData.getBaselineLayer().title]: {
                data: get(evt.features[0], 'properties.data', 'No Data'),
                coordinates,
              },
            }),
          );
        }

        if (analysisData instanceof ExposedPopulationResult) {
          dispatch(
            addPopupData({
              [analysisData.key]: {
                data: get(
                  evt.features[0],
                  `properties.${analysisData.key}`,
                  'No Data',
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
