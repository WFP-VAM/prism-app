import React, { memo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-map-gl/maplibre';
import { WMSLayerProps } from 'config/types';
import { getWMSUrl } from 'components/MapView/Layers/raster-utils';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getRequestDate } from 'utils/server-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getLayerMapId } from 'utils/map-utils';
import { appConfig, safeCountry } from 'config';
import mask from '@turf/mask';

function expandBoundingBox(
  bbox: [number, number, number, number],
  extraDegrees: number,
): [number, number, number, number] {
  const currentXDistance = bbox[2] - bbox[0];
  const currentYDistance = bbox[3] - bbox[1];
  const newXDistance = currentXDistance + 2 * extraDegrees;
  const newYDistance = currentYDistance + 2 * extraDegrees;
  const xChange = newXDistance - currentXDistance;
  const yChange = newYDistance - currentYDistance;
  const lowX = bbox[0] - xChange / 2;
  const lowY = bbox[1] - yChange / 2;
  const highX = xChange / 2 + bbox[2];
  const highY = yChange / 2 + bbox[3];

  return [lowX, lowY, highX, highY];
}

const WMSLayers = ({
  layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
  before,
}: LayersProps) => {
  const selectedDate = useDefaultDate(id);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const [invertedAdminBoundaryLimitPolygon, setAdminBoundaryPolygon] = useState(
    null,
  );

  useEffect(() => {
    // admin-boundary-unified-polygon.json is generated using "yarn preprocess-layers"
    // which runs ./scripts/preprocess-layers.js
    fetch(`data/${safeCountry}/admin-boundary-unified-polygon.json`)
      .then(response => response.json())
      .then(polygonData => setAdminBoundaryPolygon(mask(polygonData) as any))
      .catch(error => console.error('Error:', error));
  }, []);

  if (!selectedDate) {
    return null;
  }
  const layerAvailableDates = serverAvailableDates[id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const queryDateString = (queryDate ? new Date(queryDate) : new Date())
    .toISOString()
    .slice(0, 10);

  const expansionFactor = 2;
  const expandedBoundingBox = expandBoundingBox(
    appConfig.map.boundingBox,
    expansionFactor,
  );

  return (
    <>
      <Source
        id={`mask-source-${id}`}
        type="geojson"
        data={invertedAdminBoundaryLimitPolygon}
      >
        <Layer
          id={`mask-layer-${id}`}
          type="fill"
          source={`mask-source-${id}`}
          layout={{}}
          paint={{
            'fill-color': '#000',
            'fill-opacity': 0.7,
          }}
          beforeId={before}
        />
      </Source>
      <Source
        id={`source-${id}`}
        type="raster"
        // refresh tiles every time date changes
        key={queryDateString}
        tiles={[
          `${getWMSUrl(baseUrl, serverLayerName, {
            ...additionalQueryParams,
            ...(selectedDate && {
              time: queryDateString,
            }),
          })}&bbox={bbox-epsg-3857}`,
        ]}
        tileSize={256}
        bounds={expandedBoundingBox}
      >
        <Layer
          beforeId={`mask-layer-${id}`}
          type="raster"
          id={getLayerMapId(id)}
          source={`source-${id}`}
          paint={{ 'raster-opacity': opacity }}
        />
      </Source>
    </>
  );
};

export interface LayersProps {
  layer: WMSLayerProps;
  before?: string;
}

export default memo(WMSLayers);
