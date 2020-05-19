import React, { useEffect, useState } from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FillPaint, LinePaint } from 'mapbox-gl';
import { FeatureCollection } from 'geojson';
import adminBoundariesRaw from '../../../../config/admin_boundaries.json';
import {
  featureIntersectsImage,
  filterPointsByFeature,
  GeoJsonBoundary,
  indexToGeoCoords,
  loadGeoTiff,
} from '../raster-utils';
import { legendToStops } from '../layer-utils';
import { AdminAggregateLayerProps } from '../../../../config/types';

const adminBoundaries = adminBoundariesRaw as FeatureCollection;

type DataArray = { value: number }[];
const operations = {
  mean: (data: DataArray) =>
    data.reduce((sum, { value }) => sum + value, 0) / data.length,
  median: (data: DataArray) => {
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedValues = data.map(({ value }) => value).sort();
    // Odd cases we use the middle value
    if (sortedValues.length % 2 !== 0) {
      return sortedValues[Math.floor(sortedValues.length / 2)];
    }
    // Even cases we average the two middles
    const floor = sortedValues.length / 2 - 1;
    const ceil = sortedValues.length / 2;
    return (sortedValues[floor] + sortedValues[ceil]) / 2;
  },
};

const scaleValueIfDefined = (
  layer: AdminAggregateLayerProps,
  value: number,
) => {
  return layer.scale !== undefined && layer.offset !== undefined
    ? value * layer.scale + layer.offset
    : value;
};

async function operationByDistrict(layer: AdminAggregateLayerProps) {
  const { image, rasters, transform } = await loadGeoTiff('./ModisLST.tif');
  const allPoints = Array.from(rasters[0], (value, i) => ({
    ...indexToGeoCoords(i, rasters.width, transform),
    value,
  }));

  adminBoundaries.features.forEach(f => {
    const feature = f as GeoJsonBoundary;

    if (featureIntersectsImage(feature, image)) {
      const points = filterPointsByFeature(allPoints, feature);
      // eslint-disable-next-line fp/no-mutation
      feature.properties![layer.operation] = scaleValueIfDefined(
        layer,
        operations[layer.operation](points),
      );
    } else {
      // eslint-disable-next-line fp/no-mutation
      feature.properties![layer.operation] = NaN;
    }
  });

  return {
    ...adminBoundaries,
    features: adminBoundaries.features.filter(
      f => !Number.isNaN((f as GeoJsonBoundary).properties![layer.operation]),
    ),
  };
}

const linePaint: LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

interface ImpactLayerProps {
  layer: AdminAggregateLayerProps;
}

export const ImpactLayer = ({ layer }: ImpactLayerProps) => {
  const [features, setFeatures] = useState<FeatureCollection>();

  useEffect(() => {
    const load = async () => {
      setFeatures(await operationByDistrict(layer));
    };
    load();
  }, [layer]);

  if (!features) {
    return null;
  }

  const fillPaint: FillPaint = {
    'fill-opacity': layer.opacity || 0.1,
    'fill-color': {
      property: layer.operation,
      stops: legendToStops(layer.legend),
    },
  };

  return (
    <GeoJSONLayer data={features} linePaint={linePaint} fillPaint={fillPaint} />
  );
};

export default ImpactLayer;
