import GeoJSON from 'geojson';
import React from 'react';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import { LayersMap } from '../../../config/types';
import { legendToStops } from '../../../utils/layer-utils';

import groundstationDataJson from '../../../data/groundstations/longterm_data.json';

declare module 'geojson' {
  export const version: string;
  export const defaults: Object;
  export function parse(
    data: Object,
    properties: Object,
    callback?: Function,
  ): Object;
}

type GroundstationData = {
  id: number;
  index: number;
  lat: number;
  lon: number;
}[];

function onClickCircle(evt: any) {
  // eslint-disable-next-line
  console.log(
    get(evt.features[0], 'properties.index'),
    get(evt.features[0], 'properties.aimagname'),
    get(evt.features[0], 'properties.sumname'),
    get(evt.features[0], 'properties.rasterheight'),
  );
}

const groundstationDataGeoJSON = GeoJSON.parse(
  groundstationDataJson as GroundstationData,
  {
    Point: ['lat', 'lon'],
  },
);

function GroundstationLayers({ layers }: { layers: LayersMap }) {
  const layerConfig = layers.first(null);

  if (!layerConfig) {
    return null;
  }

  const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };
  const circlePaint: MapboxGL.CirclePaint = {
    'circle-color': {
      property: 'rasterheight',
      stops: legendToStops(layerConfig.legend),
    },
  };

  return (
    <GeoJSONLayer
      data={groundstationDataGeoJSON}
      circleLayout={circleLayout}
      circlePaint={circlePaint}
      circleOnClick={onClickCircle}
    />
  );
}

export default GroundstationLayers;
