import React from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import adminBoundaries from '../../../config/admin_boundaries.json';

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

/**
 * To activate fillOnClick option, we "fill in"
 * polygons with opacity 0.
 */
const fillPaint: MapboxGL.FillPaint = { 'fill-opacity': 0 };

function Boundaries() {
  return (
    <GeoJSONLayer
      data={adminBoundaries}
      linePaint={linePaint}
      fillPaint={fillPaint}
    />
  );
}

export default Boundaries;
