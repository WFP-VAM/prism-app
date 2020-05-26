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

function onToggleHover(cursor: string, targetMap: MapboxGL.Map) {
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  targetMap.getCanvas().style.cursor = cursor;
}

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function Boundaries() {
  return (
    <GeoJSONLayer
      data={baselineBoundaries}
      fillPaint={fillPaint}
      linePaint={linePaint}
      fillOnMouseEnter={(evt: any) => onToggleHover('pointer', evt.target)}
      fillOnMouseLeave={(evt: any) => onToggleHover('', evt.target)}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
      }}
    />
  );
}

export default Boundaries;
