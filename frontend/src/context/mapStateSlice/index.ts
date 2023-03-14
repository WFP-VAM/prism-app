import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerKey, LayerType } from '../../config/types';
import { LayerDefinitions } from '../../config/utils';
import { LayerData, LayerDataTypes, loadLayerData } from '../layers/layer-data';
import { BoundaryRelationsDict } from '../../components/Common/BoundaryDropdown/utils';

interface DateRange {
  startDate?: number;
  // TODO this field is updated, but doesn't seem to be used yet
  endDate?: number;
}

export type MapState = {
  layers: LayerType[];
  dateRange: DateRange;
  mapboxMap: MapGetter;
  errors: string[];
  // TODO this shouldn't be any
  layersData: LayerData<any>[];
  // Keep track of layer id which are currently loading its layerData.
  // Note that layerData is mainly for storing vector map data.
  // Tile image loading for raster layer is tracked separately on mapTileLoadingStateSlice
  loadingLayerIds: LayerKey[];
  boundaryRelationData: BoundaryRelationsDict;
};

// MapboxGL's map type contains some kind of cyclic dependency that causes an infinite loop in immers's change
// tracking. To save it off, we wrap it in a JS closure so that Redux just checks the function for changes, rather
// than recursively walking the whole object.
type MapGetter = () => MapBoxMap | undefined;

const initialState: MapState = {
  layers: [],
  dateRange: {} as DateRange,
  mapboxMap: (() => {}) as MapGetter,
  errors: [],
  layersData: [],
  loadingLayerIds: [],
  boundaryRelationData: {},
};

const TYPES_ALLOWED_TO_OVERLAP = ['boundary', 'point_data'];

function keepLayer(layer: LayerType, payload: LayerType) {
  // Simple function to control which layers can overlap.
  return (
    payload.id !== layer.id &&
    (payload.type !== layer.type ||
      TYPES_ALLOWED_TO_OVERLAP.includes(payload.type))
  );
}

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: ({ layers, ...rest }, { payload }: PayloadAction<LayerType>) => {
      const layersToAdd = payload?.group?.activateAll
        ? Object.values(LayerDefinitions).filter(l =>
            payload?.group?.layers?.map(layer => layer.id).includes(l.id),
          )
        : [payload];

      const filteredLayers = layers.filter(layer => keepLayer(layer, payload));

      // Keep boundary layers at the top of our stack
      const newLayers =
        payload.type === 'boundary'
          ? [...layersToAdd, ...filteredLayers]
          : [...filteredLayers, ...layersToAdd];

      return {
        ...rest,
        layers: newLayers,
      };
    },
    removeLayerData: (
      { layersData, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layersData: layersData.filter(({ layer }) => layer.id !== payload.id),
    }),

    removeLayer: (
      { layers, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layers: layers.filter(({ id }) =>
        // Keep layers without group and layers with group from different group.
        payload.group
          ? !payload.group.layers.map(l => l.id).includes(id)
          : id !== payload.id,
      ),
    }),

    updateDateRange: (state, { payload }: PayloadAction<DateRange>) => ({
      ...state,
      dateRange: payload,
    }),

    setMap: (state, { payload }: PayloadAction<MapGetter>) => ({
      ...state,
      mapboxMap: payload,
    }),

    setBoundaryRelationData: (
      state,
      { payload }: PayloadAction<BoundaryRelationsDict>,
    ) => ({
      ...state,
      boundaryRelationData: payload,
    }),

    dismissError: (
      { errors, ...rest },
      { payload }: PayloadAction<string>,
    ) => ({
      ...rest,
      errors: errors.filter(msg => msg !== payload),
    }),

    updateLayerOpacity: (
      { layers, ...rest },
      { payload }: PayloadAction<Pick<LayerType, 'id' | 'opacity'>>,
    ) => ({
      ...rest,
      layers: layers.map(layer => ({
        ...layer,
        opacity: layer.id === payload.id ? payload.opacity : layer.opacity,
      })),
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      loadLayerData.fulfilled,
      (
        { layersData, loadingLayerIds, ...rest },
        { payload }: PayloadAction<LayerDataTypes>,
      ) => ({
        ...rest,
        loadingLayerIds: loadingLayerIds.filter(id => id !== payload.layer.id),
        layersData: layersData.concat(payload),
      }),
    );

    builder.addCase(
      loadLayerData.rejected,
      ({ loadingLayerIds, errors, ...rest }, action) => ({
        ...rest,
        loadingLayerIds: loadingLayerIds.filter(
          id => id !== action.meta.arg.layer.id,
        ),
        errors: errors.concat(
          action.error.message ? action.error.message : action.error.toString(),
        ),
      }),
    );

    builder.addCase(
      loadLayerData.pending,
      ({ loadingLayerIds, ...rest }, action) => ({
        ...rest,
        loadingLayerIds: loadingLayerIds.concat([action.meta.arg.layer.id]),
      }),
    );
  },
});

// Setters
export const {
  addLayer,
  removeLayer,
  updateDateRange,
  setMap,
  // TODO unused
  updateLayerOpacity,
  removeLayerData,
  setBoundaryRelationData,
} = mapStateSlice.actions;

export default mapStateSlice.reducer;
