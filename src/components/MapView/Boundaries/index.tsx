import React from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import adminBoundaries from '../../../config/admin_boundaries.json';

// console.log(adminBoundaries);

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function Boundaries() {
  return (
    <GeoJSONLayer
      id="source-admin_boundaries"
      type="geojson"
      data={adminBoundaries}
      linePaint={linePaint}
    />
  );
}

export default Boundaries;
