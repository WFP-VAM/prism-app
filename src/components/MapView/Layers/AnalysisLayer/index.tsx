import React from 'react';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { useDispatch, useSelector } from 'react-redux';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import { latestAnalysisResultSelector } from '../../../../context/analysisResultStateSlice';

function AnalysisLayer() {
  const analysisData = useSelector(latestAnalysisResultSelector);
  const dispatch = useDispatch();

  if (!analysisData) return null;

  // We use the legend values from the config to define "intervals".
  const fillPaintData: MapboxGL.FillPaint = {
    'fill-opacity': 0.3,
    'fill-color': {
      property: 'data',
      stops: [],
      type: 'interval',
    },
  };

  return (
    <GeoJSONLayer
      below="boundaries"
      data={analysisData.features}
      fillPaint={fillPaintData}
      fillOnClick={(evt: any) => {
        dispatch(
          addPopupData({
            analysis: {
              data: get(
                analysisData?.features?.features[0],
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
