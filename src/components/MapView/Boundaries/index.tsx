import React from 'react';
import { get } from 'lodash';
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

// Get admin data to process.
function getAdminData(evt: any) {
  // eslint-disable-next-line
  console.log(get(evt.features[0], 'properties.ADM2_PCODE'));
}

function Boundaries({ getCoordinates, getLocationName }: any) {
  return (
    <GeoJSONLayer
      data={adminBoundaries}
      linePaint={linePaint}
      fillPaint={fillPaint}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
        getCoordinates(get(evt.features[0], 'geometry.coordinates[0][0]'));
        getLocationName(
          get(evt.features[0], 'properties.ADM1_EN')
            .concat(', ')
            .concat(get(evt.features[0], 'properties.ADM2_EN')),
        );
      }}
    />
  );
}

export default Boundaries;
