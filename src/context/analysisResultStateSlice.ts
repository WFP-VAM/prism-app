/* eslint-disable no-console */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FeatureCollection } from 'geojson';
import { get, find } from 'lodash';
import { CreateAsyncThunkTypes, RootState } from './store';
import {
  AggregationOperations,
  AsyncReturnType,
  BoundaryLayerProps,
  NSOLayerProps,
  ThresholdDefinition,
  WMSLayerProps,
} from '../config/types';
import {
  ApiData,
  BaselineLayerData,
  checkBaselineDataLayer,
  fetchApiData,
  generateFeaturesFromApiData,
} from '../utils/analysis-utils';
import { getWCSLayerUrl } from './layers/wms';
import { getBoundaryLayerSingleton } from '../config/utils';
import { Extent } from '../components/MapView/Layers/raster-utils';
import { layerDataSelector } from './mapStateSlice';
import { LayerData, LayerDataParams, loadLayerData } from './layers/layer-data';

type AnalysisResultState = {
  results: AnalysisResult[];
  error?: string;
  isLoading: boolean; // TODO possibly better loading system since this doesn't support multiple analysis loadings
};
class AnalysisResult {
  key: number = Date.now();
  features: FeatureCollection | undefined;
  tableData?: TableRow[] | undefined;
  isLoading: boolean = true;
  // this overload accepts two elements, or nothing.
  // https://stackoverflow.com/a/35998779/5279269
  // also...I managed to crash the linter by doing this (most likely a bug in eslint). Maybe an update will fix?
  /* constructor()
  constructor(tableData:TableRow[], features: FeatureCollection) TODO uncomment once eslint bug is fixed */
  constructor(tableData?: TableRow[], features?: FeatureCollection) {
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
  isLoading: false,
};

function generateTableFromApiData(
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  adminBoundariesData: LayerData<BoundaryLayerProps>,
): TableRow[] {
  return aggregateData.map((row: any) => {
    const featureBoundary = find(
      adminBoundariesData.data.features,
      (feature: any) => feature.properties.ADM2_PCODE === row.ADM2_PCODE,
    );

    let name = 'No Name';
    let nativeName = 'No Name';

    if (featureBoundary && featureBoundary.properties) {
      // eslint-disable-next-line fp/no-mutation
      name = featureBoundary.properties.ADM2_EN;

      // eslint-disable-next-line fp/no-mutation
      nativeName = featureBoundary.properties.ADM2_MN;
    }

    const tableRow: TableRow = {
      name,
      nativeName,
      mean: get(row, `stats_${AggregationOperations.mean}`, 0),
      median: get(row, `stats_${AggregationOperations.median}`, 0),
    };
    return tableRow;
  });
}

export type AnalysisDispatchParams = {
  baselineLayer: NSOLayerProps;
  hazardLayer: WMSLayerProps;
  extent: Extent;
  threshold: ThresholdDefinition;
  date: ReturnType<Date['getTime']>; // just a hint to developers that we give a date number here, not just any number
  statistic: AggregationOperations; // we might have to deviate from this if analysis accepts more than what this enum provides
};
const apiUrl = 'https://prism-api.ovio.org/stats'; // TODO both needs to be stored somewhere
const adminJson =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mng_admin_boundaries.json';

export const requestAndStoreAnalysis = createAsyncThunk<
  AnalysisResult,
  AnalysisDispatchParams,
  CreateAsyncThunkTypes
>('analysisResultState/requestAndStoreAnalysis', async (params, api) => {
  const {
    hazardLayer,
    date,
    baselineLayer,
    extent,
    statistic,
    threshold,
  } = params;
  const baselineData = layerDataSelector(baselineLayer.id)(
    api.getState(),
  ) as LayerData<NSOLayerProps>;
  const adminBoundariesData = layerDataSelector(getBoundaryLayerSingleton().id)(
    api.getState(),
  ) as LayerData<BoundaryLayerProps>;

  if (!adminBoundariesData) {
    throw new Error('Boundary Layer not loaded!');
  }
  // we force group by to be defined with &
  // eslint-disable-next-line camelcase
  const apiRequest: ApiData & { group_by: string } = {
    geotiff_url: getWCSLayerUrl({
      layer: hazardLayer,
      date,
      extent,
    }),
    zones_url:
      process.env.NODE_ENV === 'production'
        ? window.location.origin +
          getBoundaryLayerSingleton().path.replace('.', '')
        : adminJson,
    group_by: 'ADM2_PCODE', // TODO get group_by layer data from baselineLayer as per pull #94
  };
  const aggregateData = await fetchApiData(apiUrl, apiRequest);
  let baselineLayerData: BaselineLayerData;
  // if the baselineData doesn't exist, lets load it, otherwise check then load existing data.
  if (!baselineData) {
    const {
      payload: { data },
    } = (await api.dispatch(
      loadLayerData({ layer: baselineLayer, extent } as LayerDataParams<
        NSOLayerProps
      >),
    )) as { payload: { data: unknown } };

    // eslint-disable-next-line fp/no-mutation
    baselineLayerData = checkBaselineDataLayer(baselineLayer.id, data);
  } else {
    // eslint-disable-next-line fp/no-mutation
    baselineLayerData = checkBaselineDataLayer(
      baselineLayer.id,
      baselineData.data,
    );
  }

  const features = generateFeaturesFromApiData(
    aggregateData,
    hazardLayer,
    baselineLayerData,
    apiRequest.group_by,
    statistic,
    threshold,
  );
  const tableRows: TableRow[] = generateTableFromApiData(
    aggregateData,
    adminBoundariesData,
  );

  return new AnalysisResult(tableRows, {
    ...adminBoundariesData.data,
    features,
  });
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
      (
        { results, ...rest },
        { payload }: PayloadAction<AnalysisResult>,
      ): AnalysisResultState => ({
        ...rest,
        isLoading: false,
        results: [...results, payload],
      }),
    );

    builder.addCase(
      requestAndStoreAnalysis.rejected,
      (state, action): AnalysisResultState => ({
        ...state,
        isLoading: false, // TODO
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(
      requestAndStoreAnalysis.pending,
      (state): AnalysisResultState => ({
        ...state, // TODO
        isLoading: true,
      }),
    );
  },
});

// Getters
export const analysisResultSelector = (key: AnalysisResult['key']) => (
  state: RootState,
): AnalysisResult | undefined =>
  state.analysisResultState.results.find(result => result.key === key);

export const latestAnalysisResultSelector = (
  state: RootState,
): AnalysisResult | undefined => {
  const analysisResults = state.analysisResultState.results;
  if (analysisResults.length === 0) return undefined;
  return analysisResults[analysisResults.length - 1];
};
export const isAnalysisLoadingSelector = (state: RootState): boolean =>
  state.analysisResultState.isLoading;

// Setters
export const { example } = analysisResultSlice.actions;

export default analysisResultSlice.reducer;
