// TODO remove
/* eslint-disable no-console */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FeatureCollection, Position } from 'geojson';
import { get, find } from 'lodash';
import { CreateAsyncThunkTypes, RootState } from './store';
import {
  AggregationOperations,
  AsyncReturnType,
  BoundaryLayerProps,
  NSOLayerProps,
  ThresholdDefinition,
  WMSLayerProps,
  LegendDefinition,
} from '../config/types';
import {
  ApiData,
  BaselineLayerData,
  checkBaselineDataLayer,
  fetchApiData,
  generateFeaturesFromApiData,
} from '../utils/analysis-utils';
import { getWCSLayerUrl } from './layers/wms';
import { getBoundaryLayerSingleton, LayerDefinitions } from '../config/utils';
import { Extent } from '../components/MapView/Layers/raster-utils';
import { layerDataSelector } from './mapStateSlice';
import { LayerData, LayerDataParams, loadLayerData } from './layers/layer-data';
import { DataRecord, NSOLayerData } from './layers/nso';
import { BoundaryLayerData } from './layers/boundary';

type AnalysisResultState = {
  result?: AnalysisResult;
  error?: string;
  isLoading: boolean;
  isMapLayerActive: boolean;
};
export class AnalysisResult {
  key: number = Date.now();
  featureCollection: FeatureCollection;
  tableData: TableRow[];
  rawApiData?: object[];
  statistic: AggregationOperations;
  legend: LegendDefinition;
  hazardLayerId: WMSLayerProps['id'];
  baselineLayerId: NSOLayerProps['id'];

  constructor(
    tableData: TableRow[],
    featureCollection: FeatureCollection,
    hazardLayer: WMSLayerProps,
    baselineLayer: NSOLayerProps,
    statistic: AggregationOperations,
    rawApiData?: object[],
  ) {
    this.featureCollection = featureCollection;
    this.tableData = tableData;
    this.statistic = statistic;
    this.legend = baselineLayer.legend;
    this.rawApiData = rawApiData;

    this.hazardLayerId = hazardLayer.id;
    this.baselineLayerId = baselineLayer.id;
  }
  getHazardLayer(): WMSLayerProps {
    return LayerDefinitions[this.hazardLayerId] as WMSLayerProps;
  }
  getBaselineLayer(): NSOLayerProps {
    return LayerDefinitions[this.baselineLayerId] as NSOLayerProps;
  }
}

export type TableRow = {
  localName: string;
  name: string;
  baselineValue: DataRecord['value'];
  coordinates?: Position;
} & { [k in AggregationOperations]: number };

const initialState: AnalysisResultState = {
  isLoading: false,
  isMapLayerActive: true, // TODO toggle via UI
};

function generateTableFromApiData(
  aggregateData: AsyncReturnType<typeof fetchApiData>, // data from api
  // admin layer, both props and data. Aimed to closely match LayerData<BoundaryLayerProps>
  {
    layer: adminLayer,
    data: adminLayerData,
  }: { layer: BoundaryLayerProps; data: BoundaryLayerData },
  // baseline layer, both props and data
  {
    layer: { adminLevel },
    data: { layerData },
  }: { layer: NSOLayerProps; data: NSOLayerData },
): TableRow[] {
  // find the key that will let us reference the names of the bounding boxes.
  const adminLevelName =
    adminLayer.adminLevelNames[adminLevel - 1] || adminLayer.adminLevelNames[0];
  // for local name too.
  const adminLevelLocalName =
    adminLayer.adminLevelLocalNames[adminLevel - 1] ||
    adminLayer.adminLevelLocalNames[0];

  return aggregateData.map((row: any) => {
    // find feature from admin boundaries that closely matches this api row.
    // once we find it we can get the corresponding local name.
    const featureBoundary = find(
      adminLayerData.features,
      (feature: any) =>
        feature.properties[adminLevelName] === row[adminLevelName],
    );

    const name: string =
      featureBoundary?.properties?.[adminLevelName] || 'No Name';
    const localName: string =
      featureBoundary?.properties?.[adminLevelLocalName] || 'No Name';

    const baselineValue =
      layerData.find(({ adminKey }) => {
        return (featureBoundary?.properties?.[
          adminLayer.adminCode
        ] as string).startsWith(adminKey);
      })?.value || 'No Data';

    const tableRow: TableRow = {
      name,
      localName,
      mean: get(row, `stats_${AggregationOperations.Mean}`, 0),
      median: get(row, `stats_${AggregationOperations.Median}`, 0),
      baselineValue,
      coordinates: (featureBoundary?.geometry as any).coordinates[0][0][0], // TODO likely will not keep
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
  const adminBoundaries = getBoundaryLayerSingleton();
  const adminBoundariesData = layerDataSelector(adminBoundaries.id)(
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
    group_by:
      adminBoundaries.adminLevelNames[baselineLayer.adminLevel - 1] ||
      adminBoundaries.adminLevelNames[0],
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
    { layer: baselineLayer, data: baselineLayerData },
  );

  return new AnalysisResult(
    tableRows,
    {
      ...adminBoundariesData.data,
      features,
    },
    hazardLayer,
    baselineLayer,
    statistic,
    aggregateData, // TODO we only pass this to make debugging easier - not used anywhere
  );
});

export const analysisResultSlice = createSlice({
  name: 'analysisResultState',
  initialState,
  reducers: {
    setIsMapLayerActive: (state, { payload }: PayloadAction<boolean>) => ({
      ...state,
      isMapLayerActive: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      requestAndStoreAnalysis.fulfilled,
      (
        { result, ...rest },
        { payload }: PayloadAction<AnalysisResult>,
      ): AnalysisResultState => ({
        ...rest,
        isLoading: false,
        result: payload,
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
export const analysisResultSelector = (
  state: RootState,
): AnalysisResult | undefined => state.analysisResultState.result;

export const isAnalysisLoadingSelector = (state: RootState): boolean =>
  state.analysisResultState.isLoading;

export const isAnalysisLayerActiveSelector = (state: RootState): boolean =>
  state.analysisResultState.isMapLayerActive;

// Setters
export const { setIsMapLayerActive } = analysisResultSlice.actions;

export default analysisResultSlice.reducer;
