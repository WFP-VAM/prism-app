import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Position, FeatureCollection, Feature } from 'geojson';
import moment from 'moment';
import { get } from 'lodash';
import type { CreateAsyncThunkTypes, RootState } from './store';
import { defaultBoundariesFile } from '../config';
import {
  AggregationOperations,
  AsyncReturnType,
  BoundaryLayerProps,
  AdminLevelDataLayerProps,
  ThresholdDefinition,
  WMSLayerProps,
  WfsRequestParams,
  LayerKey,
  ExposedPopulationDefinition,
  TableType,
} from '../config/types';
import {
  BaselineLayerResult,
  AnalysisResult,
  ApiData,
  BaselineLayerData,
  checkBaselineDataLayer,
  fetchApiData,
  generateFeaturesFromApiData,
  createLegendFromFeatureArray,
  KeyValueResponse,
  scaleAndFilterAggregateData,
  ExposedPopulationResult,
  scaleFeatureStat,
} from '../utils/analysis-utils';
import { getFullLocationName } from '../utils/name-utils';
import { getWCSLayerUrl } from './layers/wms';
import { getBoundaryLayerSingleton, LayerDefinitions } from '../config/utils';
import { Extent } from '../components/MapView/Layers/raster-utils';
import { layerDataSelector } from './mapStateSlice/selectors';
import { LayerData, LayerDataParams, loadLayerData } from './layers/layer-data';
import { DataRecord, AdminLevelDataLayerData } from './layers/admin_level_data';
import { BoundaryLayerData } from './layers/boundary';
import { isLocalhost } from '../serviceWorker';

const ANALYSIS_API_URL = 'https://prism-api.ovio.org/stats'; // TODO both needs to be stored somewhere

export type TableRowType = { [key: string]: string | number };
export type TableData = {
  columns: string[];
  rows: TableRowType[];
};

type AnalysisResultState = {
  definition?: TableType;
  tableData?: TableData;
  result?: AnalysisResult;
  error?: string;
  isLoading: boolean;
  isMapLayerActive: boolean;
  isDataTableDrawerActive: boolean;
  isExposureLoading: boolean;
};

export type TableRow = {
  localName: string;
  name: string;
  baselineValue: DataRecord['value'];
  coordinates?: Position;
} & { [k in AggregationOperations]?: number };

const initialState: AnalysisResultState = {
  isLoading: false,
  isMapLayerActive: true,
  isDataTableDrawerActive: false,
  isExposureLoading: false,
};

/* Gets a public URL for the admin boundaries used by this application.
 *
 * If the application is in development, localhost is not accessible publicly.
 * Therefore, we will return a pre-set constant to be used for development.
 *
 * If the application is in production, we will attempt to construct a public URL that the backend should be able to access.
 */
function getAdminBoundariesURL() {
  const adminBoundariesPath = getBoundaryLayerSingleton().path;
  // already a remote location, so return it.
  if (adminBoundariesPath.startsWith('http')) {
    return adminBoundariesPath;
  }
  // do not send a local path to the API, use a fixed boundary file instead.
  if (isLocalhost) {
    return defaultBoundariesFile;
  }
  // the regex here removes the dot(s) at the beginning of a path, if there is at least one.
  // e.g the path might be ' ./data/xxx '  instead of ' /data/xxx '
  return window.location.origin + adminBoundariesPath.replace(/^\.+/, '');
}

function generateTableFromApiData(
  statistic: AggregationOperations,
  aggregateData: AsyncReturnType<typeof fetchApiData>, // data from api
  // admin layer, both props and data. Aimed to closely match LayerData<BoundaryLayerProps>
  {
    layer: adminLayer,
    data: adminLayerData,
  }: { layer: BoundaryLayerProps; data: BoundaryLayerData },
  // baseline layer, both props and data
  {
    data: { layerData: baselineLayerData },
  }: { layer: AdminLevelDataLayerProps; data: AdminLevelDataLayerData },
  apiRequest: ApiData,
): TableRow[] {
  // Reuse the groupBy parameter to generate the table
  const groupBy = apiRequest.group_by;

  // find the key that will let us reference the names of the bounding boxes. We get the one corresponding to the specific level of baseline, or the first if we fail.
  const { adminLevelNames, adminLevelLocalNames } = adminLayer;

  const groupByAdminIndex = adminLevelNames.findIndex(
    levelName => levelName === groupBy,
  );

  const adminIndex =
    groupByAdminIndex !== -1 ? groupByAdminIndex : adminLevelNames.length - 1;

  // If we want to show all comma separated admin levels, we can use all names until "adminIndex".
  const adminLevelName = adminLevelNames[adminIndex];
  // for local name too.
  const adminLevelLocalName = adminLevelLocalNames[adminIndex];

  return (aggregateData as KeyValueResponse[]).map(row => {
    // find feature (a cell on the map) from admin boundaries json that closely matches this api row.
    // we decide it matches if the feature json has the same name as the name for this row.
    // once we find it we can get the corresponding local name.

    const featureBoundary = adminLayerData.features.find(
      ({ properties }) =>
        properties?.[groupBy] === row[groupBy] ||
        properties?.[adminLevelName] === row[adminLevelName],
    );

    const name = getFullLocationName(adminLayer, featureBoundary);
    const localName: string =
      featureBoundary?.properties?.[adminLevelLocalName] || 'No Name';

    // we are searching the data of baseline layer to find the data associated with this feature
    // adminKey here refers to a specific feature (could be several) where the data is attached to.
    const rawBaselineValue =
      baselineLayerData.find(({ adminKey }) => {
        // TODO - Make this code more flexible.
        // we only check startsWith because the adminCode grows longer the deeper the level.
        // For example, 34 is state and 14 is district, therefore 3414 is a specific district in a specific state.
        // if this baseline layer only focuses on a higher level (just states) it would only contain 34, but every feature is very specific (uses the full number 3414)
        // therefore checking the start will cover all levels.
        return featureBoundary?.properties?.[adminLayer.adminCode].startsWith(
          adminKey,
        );
      })?.value || 'No Data';

    const tableRow: TableRow = {
      name,
      localName,
      [statistic]: get(row, statistic, 0),
      // Force parseFloat in case data was stored as a string
      baselineValue: parseFloat(`${rawBaselineValue}`),
      coordinates: (featureBoundary?.geometry as any)?.coordinates[0][0][0], // TODO likely will not keep
    };
    return tableRow;
  });
}

export type AnalysisDispatchParams = {
  baselineLayer: AdminLevelDataLayerProps;
  hazardLayer: WMSLayerProps;
  extent: Extent;
  threshold: ThresholdDefinition;
  date: ReturnType<Date['getTime']>; // just a hint to developers that we give a date number here, not just any number
  statistic: AggregationOperations; // we might have to deviate from this if analysis accepts more than what this enum provides
  isExposure: boolean;
};

export type ExposedPopulationDispatchParams = {
  exposure: ExposedPopulationDefinition;
  statistic: AggregationOperations;
  extent: Extent;
  date: ReturnType<Date['getTime']>;
  wfsLayerId: LayerKey;
};

const createAPIRequestParams = (
  geotiffLayer: WMSLayerProps,
  extent: Extent,
  date: ReturnType<Date['getTime']>,
  params: WfsRequestParams | AdminLevelDataLayerProps,
): ApiData => {
  const { adminLevelNames, adminCode } = getBoundaryLayerSingleton();

  // If the analysis is related to a AdminLevelData layer, we get the index from params.
  // For Exposed population we use the latest-level boundary indicator.
  // WARNING - This change is meant for RBD only. Do we want to generalize this?
  const groupBy =
    adminCode ||
    (params instanceof AdminLevelDataLayerProps
      ? adminLevelNames[params.adminLevel - 1]
      : adminLevelNames[adminLevelNames.length - 1]);

  const wfsParams = (params as WfsRequestParams).layer_name
    ? { wfs_params: params as WfsRequestParams }
    : undefined;

  const { wcsConfig } = geotiffLayer;
  const dateValue =
    !wcsConfig || wcsConfig.disableDateParam === false ? date : undefined;

  // we force group_by to be defined with &
  // eslint-disable-next-line camelcase
  const apiRequest: ApiData = {
    geotiff_url: getWCSLayerUrl({
      layer: geotiffLayer,

      // Skip date parameter if layer has disableDateParam set to true.
      date: dateValue,
      extent,
    }),
    zones_url: getAdminBoundariesURL(),
    group_by: groupBy,
    ...wfsParams,
  };

  return apiRequest;
};

export const requestAndStoreExposedPopulation = createAsyncThunk<
  AnalysisResult,
  ExposedPopulationDispatchParams,
  CreateAsyncThunkTypes
>('analysisResultState/requestAndStoreExposedPopulation', async params => {
  const { exposure, date, extent, statistic, wfsLayerId } = params;

  const { id, key } = exposure;

  const wfsLayer = LayerDefinitions[wfsLayerId] as WMSLayerProps;
  const populationLayer = LayerDefinitions[id] as WMSLayerProps;

  const wfsParams: WfsRequestParams = {
    url: `${wfsLayer.baseUrl}/ows`,
    layer_name: wfsLayer.serverLayerName,
    time: moment(date).format('YYYY-MM-DD'),
    key,
  };

  const apiRequest = createAPIRequestParams(
    populationLayer,
    extent,
    date,
    wfsParams,
  );

  const apiFeatures = (await fetchApiData(
    ANALYSIS_API_URL,
    apiRequest,
  )) as Feature[];

  const { scale, offset } = populationLayer.wcsConfig ?? {
    scale: undefined,
    offset: undefined,
  };

  const features =
    !scale && !offset
      ? apiFeatures
      : apiFeatures.map(f =>
          scaleFeatureStat(f, scale || 1, offset || 0, statistic),
        );

  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  const groupBy = apiRequest.group_by;
  const legend = createLegendFromFeatureArray(features, statistic);
  const legendText = wfsLayer.title;

  return new ExposedPopulationResult(
    collection,
    statistic,
    legend,
    legendText,
    groupBy,
    key,
  );
});

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
  ) as LayerData<AdminLevelDataLayerProps>;
  const adminBoundaries = getBoundaryLayerSingleton();
  const adminBoundariesData = layerDataSelector(adminBoundaries.id)(
    api.getState(),
  ) as LayerData<BoundaryLayerProps>;

  if (!adminBoundariesData) {
    throw new Error('Boundary Layer not loaded!');
  }
  const apiRequest = createAPIRequestParams(
    hazardLayer,
    extent,
    date,
    baselineLayer,
  );

  const aggregateData = scaleAndFilterAggregateData(
    await fetchApiData(ANALYSIS_API_URL, apiRequest),
    hazardLayer,
    statistic,
    threshold,
  );
  let loadedAndCheckedBaselineData: BaselineLayerData;
  // if the baselineData doesn't exist, lets load it, otherwise check then load existing data.
  // similar code can be found at impact.ts
  if (!baselineData) {
    const {
      payload: { data },
    } = (await api.dispatch(
      loadLayerData({ layer: baselineLayer, extent } as LayerDataParams<
        AdminLevelDataLayerProps
      >),
    )) as { payload: { data: unknown } };

    // eslint-disable-next-line fp/no-mutation
    loadedAndCheckedBaselineData = checkBaselineDataLayer(
      baselineLayer.id,
      data,
    );
  } else {
    // eslint-disable-next-line fp/no-mutation
    loadedAndCheckedBaselineData = checkBaselineDataLayer(
      baselineLayer.id,
      baselineData.data,
    );
  }

  const features = generateFeaturesFromApiData(
    aggregateData,
    loadedAndCheckedBaselineData,
    apiRequest.group_by,
    statistic,
  );

  const tableRows: TableRow[] = generateTableFromApiData(
    statistic,
    aggregateData,
    adminBoundariesData,
    { layer: baselineLayer, data: loadedAndCheckedBaselineData },
    apiRequest,
  );

  return new BaselineLayerResult(
    tableRows,
    {
      ...adminBoundariesData.data,
      features,
    },
    hazardLayer,
    baselineLayer,
    statistic,
    threshold,
    // we never use the raw api data besides for debugging. So lets not bother saving it in Redux for production
    process.env.NODE_ENV === 'production' ? undefined : aggregateData,
  );
});

export const analysisResultSlice = createSlice({
  name: 'analysisResultState',
  initialState,
  reducers: {
    addTableData: (state, { payload }: PayloadAction<TableData>) => ({
      ...state,
      tableData: payload,
    }),
    setIsMapLayerActive: (state, { payload }: PayloadAction<boolean>) => ({
      ...state,
      isMapLayerActive: payload,
    }),
    setIsDataTableDrawerActive: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => ({
      ...state,
      isDataTableDrawerActive: payload,
    }),
    setCurrentDataDefinition: (
      state,
      { payload }: PayloadAction<TableType>,
    ) => ({
      ...state,
      definition: payload,
    }),
    hideDataTableDrawer: state => ({
      ...state,
      isDataTableDrawerActive: false,
    }),
    clearAnalysisResult: state => ({
      ...state,
      result: undefined,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      requestAndStoreExposedPopulation.fulfilled,
      (
        { result, ...rest },
        { payload }: PayloadAction<AnalysisResult>,
      ): AnalysisResultState => ({
        ...rest,
        result: payload as ExposedPopulationResult,
        isExposureLoading: false,
      }),
    );

    builder.addCase(
      requestAndStoreExposedPopulation.rejected,
      (state, action): AnalysisResultState => ({
        ...state,
        isExposureLoading: false,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(
      requestAndStoreExposedPopulation.pending,
      (state): AnalysisResultState => ({
        ...state,
        isExposureLoading: true,
      }),
    );

    builder.addCase(
      requestAndStoreAnalysis.fulfilled,
      (
        { result, ...rest },
        { payload }: PayloadAction<AnalysisResult>,
      ): AnalysisResultState => ({
        ...rest,
        isLoading: false,
        result: payload as BaselineLayerResult,
      }),
    );

    builder.addCase(
      requestAndStoreAnalysis.rejected,
      (state, action): AnalysisResultState => ({
        ...state,
        isLoading: false,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(
      requestAndStoreAnalysis.pending,
      (state): AnalysisResultState => ({
        ...state,
        isLoading: true,
      }),
    );
  },
});

// Getters
export const getCurrentDefinition = (state: RootState): TableType | undefined =>
  state.analysisResultState.definition;

export const getCurrentData = (state: RootState): TableData =>
  state.analysisResultState.tableData || { columns: [], rows: [] };

export const analysisResultSelector = (
  state: RootState,
): AnalysisResult | undefined => state.analysisResultState.result;

export const isAnalysisLoadingSelector = (state: RootState): boolean =>
  state.analysisResultState.isLoading;

export const isExposureAnalysisLoadingSelector = (state: RootState): boolean =>
  state.analysisResultState.isExposureLoading;

export const isAnalysisLayerActiveSelector = (state: RootState): boolean =>
  state.analysisResultState.isMapLayerActive;

export const isDataTableDrawerActiveSelector = (state: RootState): boolean =>
  state.analysisResultState.isDataTableDrawerActive;

// Setters
export const {
  addTableData,
  setIsMapLayerActive,
  setIsDataTableDrawerActive,
  setCurrentDataDefinition,
  hideDataTableDrawer,
  clearAnalysisResult,
} = analysisResultSlice.actions;

export default analysisResultSlice.reducer;
