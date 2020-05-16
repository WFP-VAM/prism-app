import { Feature, FeatureCollection } from 'geojson';
import React from 'react';
import { get } from 'lodash';
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
    stops: [[20000, '#fff'], [120000, '#f00']]
  }
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
  let tempCode = boundaryCode
  while (tempCode && tempCode.length !==0) {
    if (tempCode === dataCode) {
      return true
    }
    tempCode = tempCode.substring(0, tempCode.length - 1);
  }
  return false
};

// If a baselineLayer is selected, extract the data for each admin boundary.
const mergedData: Feature[] = baselineBoundaries.features.map((boundary) => {
  // Admin boundaries contain an nso_code
  if (!boundary.properties) {
    return boundary
  }
  const nsoCode = boundary.properties ? boundary.properties.NSO_CODE : ''
  let boundaryData: number | null = null;
  nsoData.DataList.forEach((row) => {
    if (matchingCode(nsoCode, row.CODE)) {
      boundaryData = parseFloat(row.DTVAL_CO)
    }
  })
  boundary.properties.data = boundaryData
  return boundary;
  }
)

baselineBoundaries.features = mergedData

console.log(baselineBoundaries)

function Boundaries() {
  return (
    <GeoJSONLayer
      data={baselineBoundaries}
      linePaint={linePaint}
      fillPaint={fillPaint}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
      }}
    />
  );
}

export default Boundaries;
