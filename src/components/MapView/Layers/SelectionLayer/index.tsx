import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

/**
 * A special layer which allows you to select any cell you want within admin_boundaries programmatically.
 * To select a layer, use the Redux slice and provide which cell you want to select.
 * We currently only support granular selection (i.e. selecting a single cell on level 2).
 */
function SelectionLayer() {
  const isSelectionMode = useSelector(getIsSelectionMode);
  const selectedBoundaries = useSelector(getSelectedBoundaries);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const dispatch = useDispatch();
  const { data } = boundaryLayerState || {};
  if (!data || !isSelectionMode) {
    return null;
  }

  // We use the legend values from the config to define "intervals".
  const fillPaintData: MapboxGL.FillPaint = {
    'fill-opacity': 0.3,
    'fill-color': 'green',
  };
  const filteredData = {
    ...data,
    features: data.features.filter(cell =>
      selectedBoundaries.includes(cell.properties?.[boundaryLayer.adminCode]),
    ),
  };

  return (
    <GeoJSONLayer
      id="map-selection-layer"
      data={filteredData}
      fillPaint={fillPaintData}
      fillOnClick={(evt: any) => {
        console.log(evt);
        console.log(evt.features[0]);
      }}
    />
  );
}

export default SelectionLayer;
