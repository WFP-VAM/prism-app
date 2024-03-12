/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector } from 'react-redux';
import { getBoundaryLayerSingleton } from 'config/utils';
import {
  layerDataSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { AnticipatoryActionDataSelector } from 'context/anticipatoryActionStateSlice';
import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { Feature, Point } from 'geojson';
import turfCentroid from '@turf/centroid';
import warningLogo from './warning-logo.png';

const boundaryLayer = getBoundaryLayerSingleton();

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  // TODO: selectedDate instead of URL
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedDate = useDefaultDate(layer.id);
  const AAData = useSelector(AnticipatoryActionDataSelector);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  const map = useSelector(mapSelector);

  const date = getFormattedDate(selectedDate, DateFormat.Default);

  const adminToDraw = Object.entries(AAData)
    .filter(x => x[1].find(y => y.date === date))
    .map(x => x[0]);
  const filteredData = data && {
    ...data,
    features: data.features.filter(cell =>
      adminToDraw.includes(
        cell.properties?.[boundaryLayer.adminLevelLocalNames[1] as string],
      ),
    ),
  };

  const markers = useMemo(() => {
    if (!filteredData || !filteredData.features) {
      return [];
    }

    return filteredData.features.map(feature => {
      const centroid: Feature<Point> = turfCentroid(feature as any);
      return {
        longitude: centroid.geometry.coordinates[0],
        latitude: centroid.geometry.coordinates[1],
      };
    });
  }, [filteredData]);

  const [scalePercent, setScalePercent] = useState(1);

  useEffect(() => {
    if (!map) {
      return;
    }
    const updateScale = () => {
      if (!map) return;

      const zoom = map.getZoom();
      // The desired width in meters (500km)
      const desiredWidthInMeters = 500000;

      // Get the center of the map to calculate the scale at this point
      const center = map.getCenter();

      // Convert the distance in meters to pixels for the current zoom level
      // This calculation depends on the map projection and might need adjustments for different map libraries
      const pixelsPerMeter =
        map.project([center.lng + 0.1, center.lat]).x -
        map.project([center.lng, center.lat]).x;
      const desiredWidthInPixels =
        (desiredWidthInMeters * pixelsPerMeter) / 100000; // Convert 100km to pixels

      // Calculate the scale factor needed to adjust the marker to the desired width in pixels
      // Assuming the original width of the marker image is known
      const originalMarkerWidthInPixels = 100; // Adjust this value to the actual width of your marker image
      const scale = desiredWidthInPixels / originalMarkerWidthInPixels;

      console.log({ zoom, scale });
      setScalePercent(scale);
    };

    // Listen for zoom changes
    map?.on('zoom', updateScale);

    // Initial scale update
    updateScale();

    // Cleanup
    return () => {
      map?.off('zoom', updateScale);
    };
  }, [map]);

  return (
    <>
      <Source id="anticipatory-action" type="geojson" data={filteredData}>
        <Layer
          beforeId={before}
          id="anticipatory-action"
          type="fill"
          source="anticipatory-action"
          layout={{}}
          paint={{
            'fill-color': '#f1f1f1',
            'fill-opacity': 0.9,
          }}
        />
        <Layer
          beforeId={before}
          id="anticipatory-action-boundary"
          type="line"
          source="anticipatory-action"
          paint={{
            'line-color': 'black',
            'line-width': 2,
          }}
        />
      </Source>
      {markers.map((marker, index) => (
        <Marker
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="center"
        >
          <img
            src={warningLogo}
            alt="Warning"
            style={{
              transform: `translate(0%, 0%) scale(${scalePercent})`,
            }}
          />
        </Marker>
      ))}
    </>
  );
}

export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
  before?: string;
}

export default React.memo(AnticipatoryActionLayer);
