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

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function Boundaries({ getCoordinates, getLocationName }: any) {
  return (
    <GeoJSONLayer
      data={baselineBoundaries}
      fillPaint={fillPaint}
      linePaint={linePaint}
      fillOnClick={(evt: any) => {
        getCoordinates(evt.lngLat);
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
