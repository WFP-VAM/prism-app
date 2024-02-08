import React from 'react';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-map-gl/maplibre';
import {
  getIsSelectionMode,
  getSelectedBoundaries,
} from 'context/mapSelectionLayerStateSlice';
import { getBoundaryLayerSingleton } from 'config/utils';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { BoundaryLayerProps } from 'config/types';
import { LineLayerSpecification } from 'maplibre-gl';

const boundaryLayer = getBoundaryLayerSingleton();
const LINE_PAINT_DATA: LineLayerSpecification['paint'] = {
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
    <Source data={filteredData} type="geojson">
      <Layer
        id="map-selection-layer"
        beforeId={before}
        type="line"
        paint={LINE_PAINT_DATA}
      />
    </Source>
  );
}

export default SelectionLayer;
