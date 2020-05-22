import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Map as MapBoxMap } from 'mapbox-gl';
import { RootState } from './store';
import { LayerType } from '../config/types';
import { LayerData, LayerDataTypes, loadLayerData } from './layers/layer-data';

interface DateRange {
  startDate?: number;
  endDate?: number;
}

type MapState = {
  layers: LayerType[];
  dateRange: DateRange;
  mapboxMap: MapGetter;
  loading: number;
  errors: string[];
  layersData: { [key: string]: LayerData<any> };
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
  layersData: {},
};

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: ({ layers, ...rest }, { payload }: PayloadAction<LayerType>) => ({
      ...rest,
      layers: layers.filter(({ id }) => id !== payload.id).concat(payload),
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
        { payload }: PayloadAction<{ key: string; data: any }>,
      ) => ({
        ...rest,
        loading: loading - 1,
        layersData: { ...layersData, [payload.key]: payload.data },
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

// Getters
export const layersSelector = (state: RootState): MapState['layers'] =>
  state.mapState.layers;
export const dateRangeSelector = (state: RootState): MapState['dateRange'] =>
  state.mapState.dateRange;
export const mapSelector = (state: RootState): MapBoxMap | undefined =>
  state.mapState.mapboxMap();
// TODO: Improve the typing on this function
export const layerDataSelector = (key: string) => (
  state: RootState,
): LayerDataTypes | undefined => state.mapState.layersData[key];
export const isLoading = (state: RootState): boolean =>
  state.mapState.loading > 0;

// Setters
export const {
  addLayer,
  removeLayer,
  updateDateRange,
  setMap,
} = mapStateSlice.actions;

export default mapStateSlice.reducer;
