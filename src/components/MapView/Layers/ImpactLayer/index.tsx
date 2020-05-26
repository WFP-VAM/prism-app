import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FillPaint, LinePaint } from 'mapbox-gl';
import { Extent } from '../raster-utils';
import { legendToStops } from '../layer-utils';
import { ImpactLayerProps } from '../../../../config/types';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import {
  mapSelector,
  layerDataSelector,
  dateRangeSelector,
} from '../../../../context/mapStateSlice';

const linePaint: LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

export const ImpactLayer = ({ layer }: { layer: ImpactLayerProps }) => {
  const map = useSelector(mapSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const { data, date } =
    (useSelector(layerDataSelector(layer.id, selectedDate)) as LayerData<
      ImpactLayerProps
    >) || {};
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
    if (
      selectedDate &&
      (!data || date !== selectedDate) &&
      minX !== 0 &&
      maxX !== 0
    ) {
      const extent: Extent = [minX, minY, maxX, maxY];
      dispatch(loadLayerData({ layer, extent, date: selectedDate }));
    }
  }, [dispatch, layer, maxX, maxY, minX, minY, data, selectedDate, date]);

  if (!data) {
    return null;
  }

  const { impactFeatures, boundaries } = data;
  const noMatchingDistricts = impactFeatures.features.length === 0;

  const fillPaint: FillPaint = {
    'fill-opacity': layer.opacity || 0.1,
    'fill-color': noMatchingDistricts
      ? 'gray'
      : {
          property: 'impactValue',
          stops: legendToStops(layer.legend),
        },
  };

  return (
    <GeoJSONLayer
      data={noMatchingDistricts ? boundaries : impactFeatures}
      linePaint={linePaint}
      fillPaint={fillPaint}
    />
  );
};

export default ImpactLayer;
