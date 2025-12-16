// cannot exist within mapStateSlice due to import cycles with
// layerDataSelector(used to be mapStateSlice) -> nso/impact -> layer-data -> mapStateSlice
// x -> y .. x is used by y
import type { RootState } from 'context/store';
import type { LayerDataTypes } from 'context/layers/layer-data';
import type { LayerKey } from 'config/types';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { Map as MaplibreMap } from 'maplibre-gl';
import { isBoundaryLayer } from 'utils/boundary-layers-utils';
import type { MapState } from '.';

export const layersSelector = (state: RootState): MapState['layers'] =>
  state.mapState.layers;
export const activeLayersSelector = (state: RootState): MapState['layers'] =>
  state.mapState.layers.filter(layer => !isBoundaryLayer(layer));
export const dateRangeSelector = (state: RootState): MapState['dateRange'] =>
  state.mapState.dateRange;
export const mapSelector = (state: RootState): MaplibreMap | undefined =>
  state.mapState.maplibreMap();

export const layerDataSelector =
  (id: LayerKey, date?: number) =>
  (state: RootState): LayerDataTypes | undefined =>
    // TODO - investigate if it is safe to return the first match by id
    // if there are no match for the given date.

    state.mapState.layersData
      .slice()
      .reverse() // We want to return the most recent layer data first
      .find(
        ({ layer, date: dataDate }) =>
          layer.id === id &&
          (!date || datesAreEqualWithoutTime(date, dataDate)),
      );

export const loadingLayerIdsSelector = (state: RootState): LayerKey[] =>
  state.mapState.loadingLayerIds;

export const boundaryRelationSelector = (
  state: RootState,
): BoundaryRelationsDict => state.mapState.boundaryRelationData;
