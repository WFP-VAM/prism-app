import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FillPaint, LinePaint } from 'mapbox-gl';
import { Extent } from '../raster-utils';
import { legendToStops } from '../layer-utils';
import { ImpactLayerProps } from '../../../../config/types';
import { loadLayerData } from '../../../../context/layers/layer-data';
import {
  mapSelector,
  layerDataSelector,
} from '../../../../context/mapStateSlice';

const linePaint: LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

export const ImpactLayer = ({ layer }: { layer: ImpactLayerProps }) => {
  const map = useSelector(mapSelector);
  const { data: features } = useSelector(layerDataSelector(layer.id)) || {};
  const dispatch = useDispatch();

  const bounds = map && map.getBounds();
  const minX = bounds ? bounds.getWest() : 0;
  const maxX = bounds ? bounds.getEast() : 0;
  const minY = bounds ? bounds.getSouth() : 0;
  const maxY = bounds ? bounds.getNorth() : 0;

  useEffect(() => {
    // For now, assume that if we have layer data, we don't need to refetch. This could change down the line if we
    // want to dynamically re-fetch data based on changing map bounds.
    // Only fetch once we actually know the extent
    if (!features && minX !== 0 && maxX !== 0) {
      const extent: Extent = [minX, minY, maxX, maxY];
      dispatch(loadLayerData({ layer, extent }));
    }
  }, [dispatch, layer, maxX, maxY, minX, minY, features]);

  if (!features) {
    return null;
  }

  const fillPaint: FillPaint = {
    'fill-opacity': layer.opacity || 0.1,
    'fill-color': {
      property: 'impactValue',
      stops: legendToStops(layer.legend),
    },
  };

  return (
    <GeoJSONLayer data={features} linePaint={linePaint} fillPaint={fillPaint} />
  );
};

export default ImpactLayer;
