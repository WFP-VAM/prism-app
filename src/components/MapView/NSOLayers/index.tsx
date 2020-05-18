import { Feature, FeatureCollection } from 'geojson';
import React from 'react';
import { get, merge } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { LayersMap } from '../../../config/types';

import adminBoundariesJson from '../../../config/admin_boundaries.json';
import { getNSOData } from '../../../config/baselines';

const baselineBoundaries = adminBoundariesJson as FeatureCollection;

// Get admin data to process.
function getAdminData(evt: any) {
  // eslint-disable-next-line
  console.log(
    get(evt.features[0], 'properties.ADM1_EN'),
    get(evt.features[0], 'properties.ADM2_EN'),
    get(evt.features[0], 'properties.ADM2_PCODE'),
    get(evt.features[0], 'properties.data'),
  );
}

function matchingCode(boundaryCode: string, dataCode: string): boolean {
  return boundaryCode.indexOf(dataCode) === 0;
}

function legendToStops(legend: { value: string; color: string }[] = []) {
  return legend.map(({ value, color }) => [parseFloat(value), color]);
}

function NSOLayers({ layers }: { layers: LayersMap }) {
  // If a baselineLayer is selected, extract the data for each admin boundary.
  /**
   * TODO, make it possible to configure:
   * NSO_CODE, the property used to match admin boundaries.
   * DTVAL_CO, the column of data to extract
   */
  const { features } = baselineBoundaries;
  const layerConfig = layers.first(null);

  if (!layerConfig) {
    return null;
  }

  // We use the legend values from the config to define "intervals".
  const fillPaintData: MapboxGL.FillPaint = {
    'fill-opacity': layerConfig.opacity || 0.3,
    'fill-color': {
      property: 'data',
      stops: legendToStops(layerConfig.legend),
    },
  };

  const { DataList } = getNSOData(layerConfig.data!);

  const mergedFeatures: Feature[] = features.map(boundary => {
    // Admin boundaries contain an nso_code
    if (!boundary.properties) {
      return boundary;
    }
    const nsoCode = get(boundary, 'properties.NSO_CODE', '');

    const matchingKey = layerConfig.adminCode || 'CODE';

    const { DTVAL_CO } =
      DataList.find(data => matchingCode(nsoCode, data[matchingKey] || '')) ||
      {};

    const boundaryData: number | null = DTVAL_CO ? parseFloat(DTVAL_CO) : null;

    return merge({}, boundary, {
      properties: { data: boundaryData },
    });
  });

  const mergedBaselineBoundaries = {
    ...baselineBoundaries,
    features: mergedFeatures,
  };

  return (
    <GeoJSONLayer
      data={mergedBaselineBoundaries}
      fillPaint={fillPaintData}
      fillOnClick={(evt: any) => {
        getAdminData(evt);
      }}
    />
  );
}

export default NSOLayers;
