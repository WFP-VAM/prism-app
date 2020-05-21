import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FillPaint, LinePaint } from 'mapbox-gl';
import { FeatureCollection } from 'geojson';
import adminBoundariesRaw from '../../../../config/admin_boundaries.json';
import {
  Extent,
  featureIntersectsImage,
  filterPointsByFeature,
  GeoJsonBoundary,
  indexToGeoCoords,
  loadGeoTiff,
  WCSRequestUrl,
} from '../raster-utils';
import { legendToStops } from '../layer-utils';
import { AdminAggregateLayerProps } from '../../../../config/types';
import { mapSelector } from '../../../../context/mapStateSlice';

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

async function operationByDistrict(
  layer: AdminAggregateLayerProps,
  tileUrl: string,
) {
  const { image, rasters, transform } = await loadGeoTiff(tileUrl);
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
  const map = useSelector(mapSelector);
  const [features, setFeatures] = useState<FeatureCollection>();

  useEffect(() => {
    const load = async () => {
      console.log('firing async event');
      const bounds = map.getBounds();
      const extent: Extent = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];

      const tileUrl = WCSRequestUrl(
        layer.baseUrl,
        layer.coverageId,
        '2019-08-01',
        extent,
        layer.pixelResolution,
      );

      setFeatures(await operationByDistrict(layer, tileUrl));
    };
    if (map) {
      load();
    }
  }, [layer, map]);

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
