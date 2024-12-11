import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DateItem } from 'config/types';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import {
  AACategory,
  AAStormData,
  AnticipatoryActionState,
  StormData,
} from './types';
import { parseAndTransformAA } from './utils';
import anticipatoryActionStormData from '../../../../public/data/mozambique/anticipatory-action/aa_storm_temporary.json';

const initialState: AnticipatoryActionState = {
  data: {},
  availableDates: undefined,
  filters: {
    selectedDate: undefined,
    selectedIndex: '',
    categories: {
      Severe: true,
      Moderate: true,
    },
  },
  loading: false,
  error: null,
};

export const loadAAData = createAsyncThunk<
  {
    data: AAStormData;
    availableDates: DateItem[];
  },
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionStormState/loadAAData', async (_, { rejectWithValue }) => {
  try {
    const data = parseAndTransformAA(anticipatoryActionStormData as StormData);
    return data;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const anticipatoryActionStormStateSlice = createSlice({
  name: 'anticipatoryActionStormState',
  initialState,
  reducers: {
    setAAFilters: (
      state,
      {
        payload,
      }: PayloadAction<
        Partial<{
          viewType: 'forecast' | 'risk';
          selectedDate: string | undefined;
          selectedIndex: string;
          categories: Partial<Record<AACategory, boolean>>;
        }>
      >,
    ) => {
      const { categories, ...rest } = payload;
      const newCategories =
        categories !== undefined
          ? { ...state.filters.categories, ...categories }
          : state.filters.categories;
      const newFilters = {
        ...state.filters,
        ...rest,
        categories: newCategories,
      };
      return {
        ...state,
        filters: newFilters,
      };
    },
  },
  extraReducers: builder => {
    builder.addCase(loadAAData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      data: payload.data,
      availableDates: payload.availableDates,
    }));

    builder.addCase(loadAAData.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAAData.pending, ({ error: _error, ...state }) => ({
      ...state,
      error: null,
      loading: true,
    }));
  },
});

// export selectors
export const AADataSelector = (state: RootState) =>
  state.anticipatoryActionStormState.data;

export const AAAvailableDatesSelector = (state: RootState) =>
  state.anticipatoryActionStormState.availableDates;

export const AAFiltersSelector = (state: RootState) =>
  state.anticipatoryActionStormState.filters;

// export actions
export const { setAAFilters } = anticipatoryActionStormStateSlice.actions;

export default anticipatoryActionStormStateSlice.reducer;
