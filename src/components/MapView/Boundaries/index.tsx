import { FeatureCollection } from 'geojson';
import React from 'react';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';

import adminBoundariesJson from '../../../config/admin_boundaries.json';

const baselineBoundaries = adminBoundariesJson as FeatureCollection;

/**
 * To activate fillOnClick option, we "fill in"
 * polygons with opacity 0.
 */
const fillPaint: MapboxGL.FillPaint = {
  'fill-opacity': 0,
};

// Get admin data to process.
function getAdminData(evt: any) {
  // eslint-disable-next-line
  console.log(
    get(evt.features[0], 'properties.ADM1_EN'),
    get(evt.features[0], 'properties.ADM2_EN'),
    get(evt.features[0], 'properties.ADM2_PCODE'),
  );
}

function onToggleHover(cursor: string, map: any) {
  console.log(map);
  // eslint-disable-next-line
  map.getCanvas().style.cursor = cursor;
}

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function Boundaries(map: any) {
  return (
    <GeoJSONLayer
      data={baselineBoundaries}
      fillPaint={fillPaint}
      linePaint={linePaint}
      onMouseEnter={onToggleHover('pointer', map)}
      onMouseLeave={onToggleHover('', map)}
      fillOnMouseEnter={(evt: any) => {
        console.log(evt);
      }}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
      }}
    />
  );
}

export default Boundaries;
