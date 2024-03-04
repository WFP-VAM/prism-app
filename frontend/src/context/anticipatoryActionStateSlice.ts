import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { rawAnticipatoryAction } from 'config';
import Papa from 'papaparse';
import type { CreateAsyncThunkTypes, RootState } from './store';

const key = 'placeholder';

type AnticipatoryActionState = {
  data: any;
  loading: boolean;
  error: string | null;
};

const initialState: AnticipatoryActionState = {
  data: { columns: [], rows: [] },
  loading: false,
  error: null,
};

export const loadAAData = createAsyncThunk<
  any,
  undefined,
  CreateAsyncThunkTypes
>('anticipatoryActionState/loadAAData', async () => {
  const url = rawAnticipatoryAction?.[key]?.url as string;
  return new Promise<any>((resolve, reject) =>
    Papa.parse(url, {
      header: true,
      download: true,
      complete: results =>
        resolve({
          rows: results.data,
          columns: Object.keys(results.data[0]),
        }),
      error: error => reject(error),
    }),
  );
});

export const anticipatoryActionStateSlice = createSlice({
  name: 'anticipatoryActionState',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(loadAAData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      data: payload,
    }));

    builder.addCase(loadAAData.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAAData.pending, ({ error, ...state }) => ({
      ...state,
      error: null,
      loading: true,
    }));
  },
});

// export selectors
export const AnticipatoryActionDataSelector = (
  state: RootState,
): string | undefined => state.anticipatoryActionState.data;

// export actions
// export const {  } = tableStateSlice.actions;

export default anticipatoryActionStateSlice.reducer;
