import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerType } from '../../config/types';
import { LayerData, LayerDataTypes, loadLayerData } from '../layers/layer-data';

interface DateRange {
  startDate?: number;
  endDate?: number;
}

export type MapState = {
  layers: LayerType[];
  dateRange: DateRange;
  mapboxMap: MapGetter;
  loading: number;
  errors: string[];
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
  return payload.type !== layer.type;
}

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: ({ layers, ...rest }, { payload }: PayloadAction<LayerType>) => ({
      ...rest,
      layers: layers.filter(layer => keepLayer(layer, payload)).concat(payload),
    }),

    removeLayer: (
      { layers, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layers: layers.filter(({ id }) => id !== payload.id),
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
} = mapStateSlice.actions;

export default mapStateSlice.reducer;
