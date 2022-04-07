import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerType } from '../../config/types';
import { LayerDefinitions } from '../../config/utils';
import { LayerData, LayerDataTypes, loadLayerData } from '../layers/layer-data';

interface DateRange {
  startDate?: number;
  // TODO this field is updated, but doesn't seem to be used yet
  endDate?: number;
}

export type MapState = {
  layers: LayerType[];
  dateRange: DateRange;
  mapboxMap: MapGetter;
  loading: number;
  errors: string[];
  // TODO this shouldn't be any
  layersData: LayerData<any>[];
};

// MapboxGL's map type contains some kind of cyclic dependency that causes an infinite loop in immers's change
// tracking. To save it off, we wrap it in a JS closure so that Redux just checks the function for changes, rather
// than recursively walking the whole object.
type MapGetter = () => MapBoxMap | undefined;

const initialState: MapState = {
  layers: [],
  dateRange: {} as DateRange,
  mapboxMap: (() => {}) as MapGetter,
  // Keep track of loading state with reference counting
  loading: 0,
  errors: [],
  layersData: [],
};

function keepLayer(layer: LayerType, payload: LayerType) {
  // Simple function to control which layers can overlap.
  return (
    payload.id !== layer.id &&
    (payload.type !== layer.type || payload.type === 'boundary')
  );
}

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: ({ layers, ...rest }, { payload }: PayloadAction<LayerType>) => {
      const { name: groupName } = payload?.group || {};

      const layersToAdd = groupName
        ? Object.values(LayerDefinitions).filter(
            l => l.group?.name === groupName,
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

    removeLayer: (
      { layers, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layers: layers.filter(({ id, group }) =>
        // Keep layers without group and layers with group and different group name.
        payload.group
          ? !group || group?.name !== payload.group.name
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
        { layersData, loading, ...rest },
        { payload }: PayloadAction<LayerDataTypes>,
      ) => ({
        ...rest,
        loading: loading - 1,
        layersData: layersData.concat(payload),
      }),
    );

    builder.addCase(
      loadLayerData.rejected,
      ({ loading, errors, ...rest }, action) => ({
        ...rest,
        loading: loading - 1,
        errors: errors.concat(
          action.error.message ? action.error.message : action.error.toString(),
        ),
      }),
    );

    builder.addCase(loadLayerData.pending, ({ loading, ...rest }) => ({
      ...rest,
      loading: loading + 1,
    }));
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
} = mapStateSlice.actions;

export default mapStateSlice.reducer;
