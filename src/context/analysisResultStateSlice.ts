import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FeatureCollection } from 'geojson';
import { CreateAsyncThunkTypes, RootState } from './store';
import { AggregationOperations } from '../config/types';

type AnalysisResultState = {
  results: AnalysisResult[];
};
class AnalysisResult {
  key: number = Date.now();
  features: FeatureCollection;
  tableData: TableRow[];
  loading: boolean = true; // might move to global, lets see...
  constructor(tableData: TableRow[], features: FeatureCollection) {
    this.features = features;
    this.tableData = tableData;
  }
}

type TableRow = {
  nativeName: string;
  name: string;
} & { [k in AggregationOperations]: number };

const initialState: AnalysisResultState = {
  results: [],
};

export const requestAndStoreAnalysis = createAsyncThunk<
  AnalysisResult,
  FeatureCollection, // TODO
  CreateAsyncThunkTypes
>('serverState/loadAvailableDates', async (params, api) => {
  return new AnalysisResult([], params); // TODO
});

export const analysisResultSlice = createSlice({
  name: 'analysisResultSlice',
  initialState,
  reducers: {
    example: (state, { payload }: PayloadAction<string>) => ({
      ...state,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      requestAndStoreAnalysis.fulfilled,
      ({ results, ...rest }, { payload }: PayloadAction<AnalysisResult>) => ({
        ...rest,
        results: [...results, payload],
      }),
    );

    builder.addCase(requestAndStoreAnalysis.rejected, (state, action) => ({
      ...state,
      loading: false, // TODO
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(requestAndStoreAnalysis.pending, state => ({
      ...state, // TODO
      loading: true,
    }));
  },
});

// Getters
export const analysisResultSelector = (key: AnalysisResult['key']) => (
  state: RootState,
): AnalysisResult | undefined =>
  state.analysisResultState.results.find(result => result.key === key);

// Setters
export const { example } = analysisResultSlice.actions;

export default analysisResultSlice.reducer;
