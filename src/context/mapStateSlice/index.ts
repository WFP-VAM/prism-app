import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerForm, LayerKey, LayerType } from '../../config/types';
import { LayerData, LayerDataTypes, loadLayerData } from '../layers/layer-data';

interface DateRange {
  startDate?: number;
  endDate?: number; // TODO this field is updated, but doesn't seem to be used yet
}

export type MapState = {
  layers: LayerType[];
  dateRange: DateRange;
  mapboxMap: MapGetter;
  loading: number;
  errors: string[];
  layersData: LayerData<any>[];
  layerForms: LayerForm[];
};

export type FormInputChange = {
  layerId: LayerKey;
  inputId: string;
  value: string;
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
  layerForms: [],
};

function keepLayer(layer: LayerType, payload: LayerType) {
  // Simple function to control which layers can overlap.
  return payload.type !== layer.type;
}

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: (
      { layers, layerForms, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layers: layers.filter(layer => keepLayer(layer, payload)).concat(payload),
      layerForms: layerForms.concat(
        'formInputs' in payload
          ? [{ id: payload.id, inputs: payload.formInputs! }]
          : [],
      ),
    }),

    removeLayer: (
      { layers, layerForms, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layers: layers.filter(({ id }) => id !== payload.id),
      layerForms: layerForms.filter(({ id }) => id !== payload.id),
    }),

    setFormInputValue: (
      { layerForms, ...rest },
      { payload }: PayloadAction<FormInputChange>,
    ) => ({
      ...rest,
      layerForms: layerForms.map(layerForm =>
        layerForm.id === payload.layerId
          ? {
              id: layerForm.id,
              inputs: layerForm.inputs.map(({ id, value, ...restInput }) => ({
                id,
                value: id === payload.inputId ? payload.value : value,
                ...restInput,
              })),
            }
          : layerForm,
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
  setFormInputValue,
  updateDateRange,
  setMap,
} = mapStateSlice.actions;

export default mapStateSlice.reducer;
