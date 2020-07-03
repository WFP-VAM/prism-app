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

function AnalysisLayer() {
  const analysisData = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const dispatch = useDispatch();

  if (!analysisData || !isAnalysisLayerActive) return null;

  // We use the legend values from the baseline layer
  function fillPaintData(legend: LegendDefinition): MapboxGL.FillPaint {
    return {
      'fill-opacity': 0.3,
      'fill-color': {
        property: 'data',
        stops: legendToStops(legend),
        type: 'interval',
      },
    };
  }

  return (
    <GeoJSONLayer
      below="boundaries"
      data={analysisData.featureCollection}
      fillPaint={fillPaintData(analysisData.legend)}
      fillOnClick={(evt: any) => {
        dispatch(
          addPopupData({
            analysis: {
              data: get(
                analysisData?.featureCollection?.features[0],
                'properties.data',
                'No Data',
              ),
              coordinates: evt.lngLat,
            },
          }),
        );
      }}
    />
  );
}

export default AnalysisLayer;
