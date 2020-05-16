import { Feature, FeatureCollection } from 'geojson';
import React from 'react';
import { get, merge } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { LayersMap } from '../../../config/types';

import adminBoundariesJson from '../../../config/admin_boundaries.json';
import { getNSOData } from '../Baseline/baselines';

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
    get(evt.features[0], 'properties.ADM2_PCODE'),
    get(evt.features[0], 'properties.data'),
  );
}

const linePaint: MapboxGL.LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function matchingCode(boundaryCode: string, dataCode: string): boolean {
  return RegExp(`^${dataCode}`).test(boundaryCode);
}

function legendToStops(
  legend: {
    value: string;
    color: string;
  }[],
) {
  return legend.map(({ value, color }: any) => [parseFloat(value), color]);
}

function Boundaries({ layers }: { layers: LayersMap }) {
  // If a baselineLayer is selected, extract the data for each admin boundary.
  /**
   * TODO, make it possible to configure:
   * NSO_CODE and CODE, the property used to match admin boundaries from both files.
   * DTVAL_CO, the column of data to extract
   */
  let mergedBaselineBoundaries = baselineBoundaries;
  let fillPaintData = fillPaint;
  if (layers.size > 0) {
    const layerConfig = layers.values().next().value;

    // We use the legend values from the config to define "intervals".
    fillPaintData = {
      'fill-opacity': layerConfig.opacity || 0.3,
      'fill-color': {
        property: 'data',
        stops: legendToStops(layerConfig.legend),
      },
    };

    const mergedData: Feature[] = baselineBoundaries.features.map(boundary => {
      // Admin boundaries contain an nso_code
      if (!boundary || !boundary.properties) {
        return boundary;
      }
      const nsoCode = get(boundary, 'properties.NSO_CODE', '');

      const nsoDataset = getNSOData(layerConfig.data);
      const { DTVAL_CO } =
        nsoDataset.DataList.find(({ CODE }) => matchingCode(nsoCode, CODE)) ||
        {};

      const boundaryData: number | null = DTVAL_CO
        ? parseFloat(DTVAL_CO)
        : null;

      return merge({}, boundary, {
        properties: { data: boundaryData },
      });
    });

    mergedBaselineBoundaries = merge({}, baselineBoundaries, {
      features: mergedData,
    });
  }

  return (
    <GeoJSONLayer
      data={mergedBaselineBoundaries}
      fillPaint={fillPaintData}
      linePaint={linePaint}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
      }}
    />
  );
}

export default Boundaries;
