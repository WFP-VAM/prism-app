import { Feature, FeatureCollection } from 'geojson';
import React from 'react';
import { get, merge } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';

import adminBoundariesJson from '../../../config/admin_boundaries.json';
import nsoData from '../../../data/nso/number_of_disabled_persons.json';

const baselineBoundaries = adminBoundariesJson as FeatureCollection;

/**
 * To activate fillOnClick option, we "fill in"
 * polygons with opacity 0.
 */
const fillPaint: MapboxGL.FillPaint = {
  'fill-opacity': 1,
  'fill-color': {
    property: 'data',
    stops: [
      [20000, '#fff'],
      [120000, '#f00'],
    ],
  },
};

// Get admin data to process.
function getAdminData(evt: any) {
  // eslint-disable-next-line
  console.log(get(evt.features[0], 'properties.ADM2_PCODE'));
}

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function matchingCode(boundaryCode: string, dataCode: string): boolean {
  return RegExp(`^${dataCode}`).test(boundaryCode);
}

// If a baselineLayer is selected, extract the data for each admin boundary.
const mergedData: Feature[] = baselineBoundaries.features.map(boundary => {
  // Admin boundaries contain an nso_code
  if (!boundary || !boundary.properties) {
    return boundary;
  }
  const nsoCode = get(boundary, 'properties.NSO_CODE', '');

  const { DTVAL_CO } =
    nsoData.DataList.find(({ CODE }) => matchingCode(nsoCode, CODE)) || {};

  const boundaryData: number | null = DTVAL_CO ? parseFloat(DTVAL_CO) : null;

  return merge({}, boundary, {
    properties: { data: boundaryData },
  });
});

const mergedBaselineBoundaries = merge({}, baselineBoundaries, {
  features: mergedData,
});

console.log(mergedBaselineBoundaries);

function Boundaries() {
  return (
    <GeoJSONLayer
      data={mergedBaselineBoundaries}
      linePaint={linePaint}
      fillPaint={fillPaint}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
      }}
    />
  );
}

export default Boundaries;
