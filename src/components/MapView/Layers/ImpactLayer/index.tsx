import React, { useEffect, useState } from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FillPaint, LinePaint } from 'mapbox-gl';
import adminBoundaries from '../../../../config/admin_boundaries.json';
import {
  featureIntersectsImage,
  filterPointsByFeature,
  GeoJsonBoundary,
  indexToGeoCoords,
  loadGeoTiff,
} from '../raster-utils';

async function loadImage() {
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
      feature.properties!.avgValue =
        points.reduce((sum, { value }) => sum + value, 0) / points.length;
    } else {
      // eslint-disable-next-line fp/no-mutation
      feature.properties!.avgValue = 0;
    }
  });

  return {
    ...adminBoundaries,
    features: adminBoundaries.features.filter(
      f => (f as GeoJsonBoundary).properties!.avgValue > 0,
    ),
  };
}

const linePaint: LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

const fillPaint: FillPaint = { 'fill-opacity': 0.1, 'fill-color': 'red' };

export const ImpactLayer = () => {
  const [features, setFeatures] = useState<typeof adminBoundaries>();

  useEffect(() => {
    const load = async () => {
      setFeatures(await loadImage());
    };
    load();
  }, []);

  return features ? (
    <GeoJSONLayer data={features} linePaint={linePaint} fillPaint={fillPaint} />
  ) : null;
};

export default ImpactLayer;
