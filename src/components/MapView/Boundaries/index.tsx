import { FeatureCollection } from 'geojson';
import React from 'react';
import { useDispatch } from 'react-redux';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { showPopup } from '../../../context/tooltipStateSlice';

import adminBoundariesJson from '../../../config/admin_boundaries.json';

const baselineBoundaries = adminBoundariesJson as FeatureCollection;

/**
 * To activate fillOnClick option, we "fill in"
 * polygons with opacity 0.
 */
const fillPaint: MapboxGL.FillPaint = {
  'fill-opacity': 0,
};

function onToggleHover(cursor: string, targetMap: MapboxGL.Map) {
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  targetMap.getCanvas().style.cursor = cursor;
}

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.8,
};

function Boundaries() {
  const dispatch = useDispatch();
  return (
    <GeoJSONLayer
      id="boundaries"
      data={baselineBoundaries}
      fillPaint={fillPaint}
      linePaint={linePaint}
      fillOnMouseEnter={(evt: any) => onToggleHover('pointer', evt.target)}
      fillOnMouseLeave={(evt: any) => onToggleHover('', evt.target)}
      fillOnClick={(evt: any) => {
        const coordinates = evt.lngLat;
        const locationName = get(evt.features[0], 'properties.ADM1_EN', '')
          .concat(', ')
          .concat(get(evt.features[0], 'properties.ADM2_EN', ''));
        dispatch(showPopup({ coordinates, locationName }));
      }}
    />
  );
}

export default Boundaries;
