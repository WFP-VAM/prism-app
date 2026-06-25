import { getBoundaryLayerSingleton } from 'config/utils';
import {
  getIsSelectionMode,
  getSelectedBoundaries,
} from 'context/mapSelectionLayerStateSlice';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { LineLayerSpecification } from 'maplibre-gl';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { filterFeaturesBySelectedAdminCodes } from 'utils/adminAreaSelection';
import { useBoundaryData } from 'utils/useBoundaryData';

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
  const map = useSelector(mapSelector);
  const { data } = useBoundaryData(boundaryLayer.id, map);
  if (!data || !isSelectionMode) {
    return null;
  }

  const filteredData = {
    ...data,
    features: filterFeaturesBySelectedAdminCodes(
      data.features,
      boundaryLayer,
      selectedBoundaries,
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
