import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { DateItem } from 'config/types';
import type { CreateAsyncThunkTypes, RootState } from '../../store';
import { AAStormData, AnticipatoryActionState, StormData } from './types';
import { parseAndTransformAA } from './utils';
import anticipatoryActionStormData from '../../../../public/data/mozambique/anticipatory-action/aa_storm_temporary.json';

const initialState: AnticipatoryActionState = {
  data: {},
  availableDates: undefined,
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
  reducers: {},
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

export default anticipatoryActionStormStateSlice.reducer;
