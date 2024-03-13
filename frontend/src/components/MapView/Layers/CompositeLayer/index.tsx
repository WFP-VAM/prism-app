import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import { CompositeLayerProps, LegendDefinition } from 'config/types';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import React, { memo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Source, Layer } from 'react-map-gl/maplibre';
import { getLayerMapId } from 'utils/map-utils';
import { FillLayerSpecification } from 'maplibre-gl';
import { Point } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { availableDatesSelector } from 'context/serverStateSlice';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getRequestDate } from 'utils/server-utils';
import { safeCountry } from 'config';
import { geoToH3, h3ToGeoBoundary } from 'h3-js'; // ts-ignore
import { opacitySelector } from 'context/opacityStateSlice';
import { legendToStops } from '../layer-utils';

const styles = () => createStyles({});

interface Props extends WithStyles<typeof styles> {
  layer: CompositeLayerProps;
  before?: string;
}

const paintProps: (
  legend: LegendDefinition,
  opacity: number | undefined,
) => FillLayerSpecification['paint'] = (
  legend: LegendDefinition,
  opacity?: number,
) => ({
  'fill-opacity': opacity || 0.5,
  'fill-color': [
    'interpolate',
    ['linear'],
    ['get', 'value'],
    ...legendToStops(legend).flat(),
  ],
});

const CompositeLayer = ({ layer, before }: Props) => {
  // look to refacto with impactLayer and maybe other layers
  const [adminBoundaryLimitPolygon, setAdminBoundaryPolygon] = useState(null);
  const selectedDate = useDefaultDate(layer.dateLayer);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const opacityState = useSelector(opacitySelector(layer.id));
  const dispatch = useDispatch();

  const { data } =
    (useSelector(layerDataSelector(layer.id)) as LayerData<
      CompositeLayerProps
    >) || {};

  const layerAvailableDates = serverAvailableDates[layer.dateLayer];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  useEffect(() => {
    // admin-boundary-unified-polygon.json is generated using "yarn preprocess-layers"
    // which runs ./scripts/preprocess-layers.js
    fetch(`data/${safeCountry}/admin-boundary-unified-polygon.json`)
      .then(response => response.json())
      .then(polygonData => setAdminBoundaryPolygon(polygonData))
      .catch(error => console.error('Error:', error));
  }, []);

  useEffect(() => {
    dispatch(loadLayerData({ layer, date: queryDate }));
  }, [dispatch, layer, queryDate]);

  // Investigate performance impact of hexagons for large countries
  const finalFeatures =
    data &&
    data.features
      .map(feature => {
        const point = feature.geometry as Point;
        if (
          !adminBoundaryLimitPolygon ||
          booleanPointInPolygon(
            point.coordinates,
            adminBoundaryLimitPolygon as any,
          )
        ) {
          // Convert the point to a hexagon
          const hexagon = geoToH3(
            point.coordinates[1],
            point.coordinates[0],
            6, // resolution, adjust as needed
          );
          return {
            ...feature,
            geometry: {
              type: 'Polygon',
              coordinates: [h3ToGeoBoundary(hexagon, true)], // Convert the hexagon to a GeoJSON polygon
            },
          };
        }
        return null;
      })
      .filter(Boolean);

  if (selectedDate && data && adminBoundaryLimitPolygon) {
    const filteredData = {
      ...data,
      features: finalFeatures,
    };
    return (
      <Source type="geojson" data={filteredData}>
        <Layer
          id={getLayerMapId(layer.id)}
          type="fill"
          paint={paintProps(layer.legend || [], opacityState || layer.opacity)}
          beforeId={before}
        />
      </Source>
    );
  }

  return null;
};

export default memo(withStyles(styles)(CompositeLayer));
