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
import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import { Feature, Point } from 'geojson';
import turfCentroid from '@turf/centroid';
import warningLogo from './warning-logo.png';
import {
  AACategoryFiltersSelector,
  AASelectedWindowSelector,
  AnticipatoryActionDataSelector,
  allWindowsKey,
} from 'context/anticipatoryActionStateSlice';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import {
  AADataSeverityOrder,
  getAAColor,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';

const boundaryLayer = getBoundaryLayerSingleton();

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  const selectedDate = useDefaultDate(layer.id);
  const AAData = useSelector(AnticipatoryActionDataSelector);
  const aaWindow = useSelector(AASelectedWindowSelector);
  const aaCategories = useSelector(AACategoryFiltersSelector);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  const map = useSelector(mapSelector);

  const date = getFormattedDate(selectedDate, DateFormat.Default);

  const districtsWithColors = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(AAData).map(([district, districtData]) => {
          const sameDateAndWindow = districtData.filter(
            x =>
              x.date === date &&
              (aaWindow === allWindowsKey || x.windows === aaWindow),
          );

          if (sameDateAndWindow.length === 0) {
            return [district, getAAColor('ny', 'ny', true)];
          }

          const active = sameDateAndWindow.filter(
            x =>
              x.probability !== 'NA' &&
              Number(x.probability) >= Number(x.trigger),
          );
          if (active.length === 0) {
            return [district, getAAColor('na', 'na', true)];
          }

          const max = active.reduce(
            (prev, curr) => {
              const currVal = AADataSeverityOrder(curr.category, curr.phase);
              return currVal > prev.val ? { val: currVal, data: curr } : prev;
            },
            { val: -1, data: active[0] },
          );

          if (aaCategories[max.data.category] === false) {
            return [district, null];
          }

          return [
            district,
            getAAColor(max.data.category, max.data.phase, true),
          ];
        }),
      ),
    [AAData, aaCategories, aaWindow, date],
  );

  const layers = Object.entries(districtsWithColors)
    .map(([district, color]) => {
      const features = [
        data?.features.find(
          cell =>
            cell.properties?.[boundaryLayer.adminLevelLocalNames[1]] ===
            district,
        ),
      ];
      return {
        id: `anticipatory-action-${district}`,
        data: { ...data, features },
        color,
      };
    })
    .filter(x => x.color !== null);

  const markers = useMemo(() => {
    if (!districtsWithColors || !districtsWithColors.features) {
      return [];
    }

    return layers.map(layer => {
      const centroid: Feature<Point> = turfCentroid(layer.data as any);
      return {
        longitude: centroid.geometry.coordinates[0],
        latitude: centroid.geometry.coordinates[1],
      };
    });
  }, [layers]);

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
      {layers.map(l => (
        <Source key={l.id} id={l.id} type="geojson" data={l.data}>
          <Layer
            beforeId={before}
            type="fill"
            id={l.id}
            source={l.id}
            layout={{}}
            paint={{
              'fill-color': l.color as string,
              'fill-opacity': 0.9,
            }}
          />
          <Layer
            beforeId={before}
            id={`${l.id}-boundary`}
            type="line"
            source={l.id}
            paint={{
              'line-color': 'black',
              'line-width': 2,
            }}
          />
        </Source>
      ))}
    </>
  );
}

export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
  before?: string;
}

export default React.memo(AnticipatoryActionLayer);
