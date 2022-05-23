import React from 'react';
import { useSelector } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import {
  getIsSelectionMode,
  getSelectedBoundaries,
} from '../../../../context/mapSelectionLayerStateSlice';
import { getBoundaryLayerSingleton } from '../../../../config/utils';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { LayerData } from '../../../../context/layers/layer-data';
import { BoundaryLayerProps } from '../../../../config/types';

const boundaryLayer = getBoundaryLayerSingleton();
const LINE_PAINT_DATA: MapboxGL.LinePaint = {
  'line-color': 'green',
  'line-width': 4,
};

/**
 * A special layer which allows you to select any cell you want within admin_boundaries programmatically.
 * To select a layer, use the Redux slice and provide which cell you want to select.
 * We currently only support granular selection (i.e. selecting a single cell on level 2).
 */
function SelectionLayer({ before }: { before?: string }) {
  const isSelectionMode = useSelector(getIsSelectionMode);
  const selectedBoundaries = useSelector(getSelectedBoundaries);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  if (!data || !isSelectionMode) {
    return null;
  }

  const filteredData = {
    ...data,
    features: data.features.filter(cell =>
      selectedBoundaries.includes(cell.properties?.[boundaryLayer.adminCode]),
    ),
  };

  return (
    <GeoJSONLayer
      id="map-selection-layer"
      before={before}
      data={filteredData}
      linePaint={LINE_PAINT_DATA}
    />
  );
}

export default SelectionLayer;
