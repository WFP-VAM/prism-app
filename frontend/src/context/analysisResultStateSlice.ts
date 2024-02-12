import {
  createAsyncThunk,
  createSlice,
  Dispatch,
  PayloadAction,
} from '@reduxjs/toolkit';
import centroid from '@turf/centroid';
import { convertArea } from '@turf/helpers';
import {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Position,
} from 'geojson';
import { get, groupBy as _groupBy, uniq } from 'lodash';
import { createGetCoverageUrl } from 'prism-common';
import { calculate } from 'utils/zonal-utils';

import { defaultBoundariesPath } from 'config';
import {
  AdminLevelDataLayerProps,
  AdminLevelType,
  AggregationOperations,
  AllAggregationOperations,
  AsyncReturnType,
  BoundaryLayerProps,
  ExposedPopulationDefinition,
  ExposureValue,
  LayerKey,
  PolygonalAggregationOperations,
  TableType,
  ThresholdDefinition,
  WfsRequestParams,
  WMSLayerProps,
  ZonalPolygonRow,
} from 'config/types';
import { getAdminLevelLayer, getAdminNameProperty } from 'utils/admin-utils';
import {
  AnalysisResult,
  ApiData,
  appendBoundaryProperties,
  BaselineLayerData,
  BaselineLayerResult,
  checkBaselineDataLayer,
  Column,
  createLegendFromFeatureArray,
  ExposedPopulationResult,
  fetchApiData,
  generateFeaturesFromApiData,
  KeyValueResponse,
  PolygonAnalysisResult,
  scaleAndFilterAggregateData,
  scaleFeatureStat,
} from 'utils/analysis-utils';
import { getRoundedData } from 'utils/data-utils';
import { getFullLocationName } from 'utils/name-utils';
import {
  getBoundaryLayersByAdminLevel,
  getBoundaryLayerSingleton,
  getStacBand,
  LayerDefinitions,
} from 'config/utils';
import {
  Extent,
  getDownloadGeotiffURL,
} from 'components/MapView/Layers/raster-utils';
import { fetchWMSLayerAsGeoJSON } from 'utils/server-utils';
import { isLocalhost } from 'serviceWorker';
import { ANALYSIS_API_URL } from 'utils/constants';
import { getDateFormat } from 'utils/date-utils';
import { layerDataSelector } from './mapStateSlice/selectors';
import { LayerData, LayerDataParams, loadLayerData } from './layers/layer-data';
import { DataRecord } from './layers/admin_level_data';
import { BoundaryLayerData } from './layers/boundary';
import type { CreateAsyncThunkTypes, RootState } from './store';

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
  exposureLayerId: string;
  isLoading: boolean;
  isMapLayerActive: boolean;
  isDataTableDrawerActive: boolean;
  isExposureLoading: boolean;
  opacity: number;
  analysisResultDataSortByKey: Column['id'];
  analysisResultDataSortOrder: 'asc' | 'desc';
  exposureAnalysisResultDataSortByKey: Column['id'];
  exposureAnalysisResultDataSortOrder: 'asc' | 'desc';
};

export type TableRow = {
  key: string;
  localName: string;
  name: string;
  baselineValue: DataRecord['value'];
  coordinates?: Position;
} & {
  [k in AggregationOperations]?: number | string;
} & { [key: string]: number | string }; // extra columns like wind speed or earthquake magnitude

const initialState: AnalysisResultState = {
  isLoading: false,
  isMapLayerActive: true,
  isDataTableDrawerActive: false,
  exposureLayerId: '',
  isExposureLoading: false,
  analysisResultDataSortByKey: 'name',
  analysisResultDataSortOrder: 'asc',
  exposureAnalysisResultDataSortByKey: 'name',
  exposureAnalysisResultDataSortOrder: 'asc',
  opacity: 0.5,
};

/* Gets a public URL for the admin boundaries used by this application.
 *
 * If the application is in development, localhost is not accessible publicly.
 * Therefore, we will return a pre-set constant to be used for development.
 *
 * If the application is in production, we will attempt to construct a public URL that the backend should be able to access.
 */
function getAdminBoundariesURL(adminBoundariesPath: string) {
  // already a remote location, so return it.
  if (adminBoundariesPath.startsWith('http')) {
    return adminBoundariesPath;
  }
  // do not send a local path to the API, use a fixed boundary file instead.
  if (isLocalhost) {
    return defaultBoundariesPath;
  }
  return (
    window.location.origin + window.location.pathname + adminBoundariesPath
  );
}

const generateTableColumnsFromApiData = (
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  key: string = 'sum',
): Column[] => {
  if (key === 'sum') {
    return [
      {
        id: 'sum',
        label: 'Sum',
        format: (value: string | number) => getRoundedData(value, undefined, 0),
      },
    ];
  }
  return uniq(
    aggregateData.map(f => f.properties && (f.properties as any)[key]),
  ).map((col: string) => ({
    id: col,
    label: col,
    format: (value: string | number) => getRoundedData(value, undefined, 0),
  })) as Column[];
};

const getFeatureBoundary = (
  isExposureAnalysisTable: boolean,
  adminLayerData: BoundaryLayerData,
  groupBy: string,
  row: KeyValueResponse,
  adminLevelName: string,
): Feature<Geometry, GeoJsonProperties> | undefined => {
  if (isExposureAnalysisTable) {
    return adminLayerData.features.find(
      ({ properties }) =>
        properties?.[groupBy] ===
          row?.properties?.[groupBy as keyof typeof properties] ||
        properties?.[adminLevelName] ===
          row?.properties[adminLevelName as keyof typeof properties],
    );
  }
  return adminLayerData.features.find(
    ({ properties }) =>
      properties?.[groupBy] === row[groupBy] ||
      properties?.[adminLevelName] === row[adminLevelName],
  );
};

const getMultipleStatistics = (
  isExposureAnalysisTable: boolean,
  fields: (
    | AllAggregationOperations
    | (KeyValueResponse | Feature<Geometry, GeoJsonProperties>)
  )[],
  statistics: AllAggregationOperations[],
  row: KeyValueResponse,
): { [p: string]: string | number } => {
  if (isExposureAnalysisTable) {
    return Object.fromEntries(
      fields.map(statistic => [
        statistic,
        get(row.properties, statistic as string, 0),
      ]),
    );
  }
  return Object.fromEntries(
    statistics.map(statistic => [statistic, get(row, statistic, 0)]),
  );
};

const getLabeledColumns = (
  row: KeyValueResponse,
  fields: (
    | AllAggregationOperations
    | (KeyValueResponse | Feature<Geometry, GeoJsonProperties>)
  )[],
  key?: string,
): { [p: string]: string | number } => {
  if (!key) {
    return {};
  }
  const label = get(row.properties, key);
  if (fields.includes(label)) {
    return { [label]: get(row.properties, 'sum', 0) };
  }
  return {};
};

const generateTableFromApiData = (
  statistics: AllAggregationOperations[],
  aggregateData: AsyncReturnType<typeof fetchApiData>, // data from api
  // admin layer, both props and data. Aimed to closely match LayerData<BoundaryLayerProps>
  {
    layer: adminLayer,
    data: adminLayerData,
  }: { layer: BoundaryLayerProps; data: BoundaryLayerData },
  groupBy: string, // Reuse the groupBy parameter to generate the table
  baselineLayerData: DataRecord[] | null,
  extraColumns: string[],
  isExposureAnalysisTable: boolean = false,
  key?: string,
): TableRow[] => {
  // find the key that will let us reference the names of the bounding boxes.
  // We get the one corresponding to the specific level of baseline, or the first if we fail.
  const { adminLevelNames, adminLevelLocalNames } = adminLayer;

  const groupByAdminIndex = adminLevelNames.findIndex(
    levelName => levelName === groupBy,
  );

  const fields: (
    | AllAggregationOperations
    | (KeyValueResponse | Feature<Geometry, GeoJsonProperties>)
  )[] = key
    ? uniq(aggregateData.map(f => f.properties && (f.properties as any).label))
    : statistics;

  const adminIndex =
    groupByAdminIndex !== -1 ? groupByAdminIndex : adminLevelNames.length - 1;

  // If we want to show all comma separated admin levels, we can use all names until "adminIndex".
  const adminLevelName = adminLevelNames[adminIndex];

  return (aggregateData as KeyValueResponse[]).map((row, i) => {
    // find feature (a cell on the map) from admin boundaries json that closely matches this api row.
    // we decide it matches if the feature json has the same name as the name for this row.
    // once we find it we can get the corresponding local name.
    const featureBoundary:
      | Feature<Geometry, GeoJsonProperties>
      | undefined = getFeatureBoundary(
      isExposureAnalysisTable,
      adminLayerData,
      groupBy,
      row,
      adminLevelName,
    );

    const name = getFullLocationName(
      adminLevelNames.slice(0, adminIndex + 1),
      featureBoundary,
    );
    const localName = getFullLocationName(
      adminLevelLocalNames.slice(0, adminIndex + 1),
      featureBoundary,
    );

    // we are searching the data of baseline layer to find the data associated with this feature
    // adminKey here refers to a specific feature (could be several) where the data is attached to.
    const rawBaselineValue =
      baselineLayerData?.find(({ adminKey }) => {
        // TODO - Make this code more flexible.
        // we only check startsWith because the adminCode grows longer the deeper the level.
        // For example, 34 is state and 14 is district, therefore 3414 is a specific district in a specific state.
        // if this baseline layer only focuses on a higher level (just states) it would only contain 34, but every feature is very specific (uses the full number 3414)
        // therefore checking the start will cover all levels.
        return featureBoundary?.properties?.[adminLayer.adminCode].startsWith(
          adminKey,
        );
      })?.value || 'No Data';

    // The multiple statistics for the new table row
    const multipleStatistics: {
      [p: string]: string | number;
    } = getMultipleStatistics(isExposureAnalysisTable, fields, statistics, row);

    // The labeled columns
    const labeledColumns: { [p: string]: string | number } = getLabeledColumns(
      row,
      fields,
      key,
    );

    // Get the centroid coordinates of the feature. NOTE - this might be slow for large features.
    const centroidCoordinates = featureBoundary?.geometry
      ? (centroid(featureBoundary.geometry as any).geometry.coordinates as [
          number,
          number,
        ])
      : undefined;

    const tableRow: TableRow = {
      key: i.toString(), // primary key, identifying a unique row in the table
      name,
      localName,
      // copy multiple statistics to the new table row
      ...multipleStatistics,
      ...labeledColumns,
      // Force parseFloat in case data was stored as a string
      baselineValue:
        rawBaselineValue === 'No Data'
          ? 'No Data'
          : parseFloat(`${rawBaselineValue}`),
      coordinates: centroidCoordinates as any,
      ...Object.fromEntries(
        extraColumns.map(extraColumn => [extraColumn, get(row, extraColumn)]),
      ),
    };
    return tableRow;
  });
};

export type AnalysisDispatchParams = {
  baselineLayer: AdminLevelDataLayerProps | BoundaryLayerProps;
  hazardLayer: WMSLayerProps;
  extent: Extent;
  threshold: ThresholdDefinition;
  date: ReturnType<Date['getTime']>; // just a hint to developers that we give a date number here, not just any number
  statistic: AggregationOperations; // we might have to deviate from this if analysis accepts more than what this enum provides
  exposureValue: ExposureValue;
};

export type PolygonAnalysisDispatchParams = {
  hazardLayer: WMSLayerProps;
  adminLevel: AdminLevelType;
  adminLevelLayer: BoundaryLayerProps;
  adminLevelData: FeatureCollection;
  extent: Extent;
  // just a hint to developers that we give a date number here, not just any number
  startDate: ReturnType<Date['getTime']>;
  endDate: ReturnType<Date['getTime']>;
};

export type ExposedPopulationDispatchParams = {
  exposure: ExposedPopulationDefinition;
  statistic: AggregationOperations;
  extent: Extent;
  date: ReturnType<Date['getTime']>;
  wfsLayerId?: LayerKey;
  maskLayerId?: LayerKey;
};

async function createAPIRequestParams(
  geotiffLayer: WMSLayerProps,
  extent: Extent,
  date: ReturnType<Date['getTime']>,
  dispatch: Dispatch,
  params?: WfsRequestParams | AdminLevelDataLayerProps | BoundaryLayerProps,
  maskParams?: any,
  geojsonOut?: boolean,
  exposureValue?: ExposureValue,
): Promise<ApiData> {
  // Get default values for groupBy and admin boundary file path at the proper adminLevel
  const {
    path: adminBoundariesPath,
    adminCode: groupBy,
  } = getBoundaryLayersByAdminLevel(
    (params as AdminLevelDataLayerProps)?.adminLevel,
  );

  // Note - This may not work when running locally as the function
  // will default to the boundary layer hosted in S3.
  const zonesUrl = getAdminBoundariesURL(adminBoundariesPath);

  // eslint-disable-next-line camelcase
  const wfsParams = (params as WfsRequestParams)?.layer_name
    ? { wfs_params: params as WfsRequestParams }
    : undefined;

  const {
    additionalQueryParams,
    baseUrl,
    serverLayerName,
    wcsConfig,
  } = geotiffLayer;
  const dateValue = !wcsConfig?.disableDateParam ? date : undefined;
  const dateString = getDateFormat(dateValue, 'default');

  // get geotiff url using band
  const band = getStacBand(additionalQueryParams);
  // Get geotiff_url using STAC for layers in earthobservation.vam.
  // TODO - What happens if there is no date? are some layers not STAC?
  const geotiffUrl =
    baseUrl.includes('api.earthobservation.vam.wfp.org/ows') &&
    // use WCS for flood exposure analysis because of a bug with gdal_calc
    !serverLayerName.includes('wp_pop_cicunadj')
      ? await getDownloadGeotiffURL(
          serverLayerName,
          band,
          extent,
          dateString,
          dispatch,
        )
      : createGetCoverageUrl({
          bbox: extent,
          bboxDigits: 1,
          date: dateValue,
          layerId: serverLayerName,
          resolution: wcsConfig?.pixelResolution,
          url: baseUrl,
        });

  // we force group_by to be defined with &
  // eslint-disable-next-line camelcase
  const apiRequest: ApiData = {
    geotiff_url: geotiffUrl,
    zones_url: zonesUrl,
    group_by: groupBy,
    ...wfsParams,
    ...maskParams,
    // TODO - remove the need for the geojson_out parameters. See TODO in zonal_stats.py.
    geojson_out: Boolean(geojsonOut),
    intersect_comparison:
      exposureValue?.operator && exposureValue.value
        ? `${exposureValue?.operator}${exposureValue?.value}`
        : undefined,
  };

  return apiRequest;
}

const mergeTableRows = (tableRows: TableRow[]): TableRow => {
  /* eslint-disable no-param-reassign, fp/no-mutation */
  const mergedObject: TableRow = tableRows.reduce(
    (acc, tableRow) => {
      return Object.keys(tableRow).reduce((tableRowAcc, tableRowKey) => {
        if (typeof tableRow[tableRowKey] === 'number') {
          tableRowAcc[tableRowKey] = tableRowAcc[tableRowKey]
            ? Number(tableRowAcc[tableRowKey]) + Number(tableRow[tableRowKey])
            : tableRow[tableRowKey];
        } else {
          tableRowAcc[tableRowKey] = tableRow[tableRowKey];
        }
        return tableRowAcc;
      }, acc);
    },
    {
      key: '',
      localName: '',
      name: '',
      baselineValue: '',
    },
  );

  // TEMPORARY LOGIC TO DEDUP POPULATION COUNTS FOR WIND BUFFERS.
  const oneHundredTwenty = Number(get(mergedObject, '120 km/h', 0));
  const ninety =
    Number(get(mergedObject, '90 km/h', 0)) -
    Number(get(mergedObject, '120 km/h', 0));
  const sixty =
    Number(get(mergedObject, '60 km/h', 0)) -
    Number(get(mergedObject, '90 km/h', 0));

  mergedObject['120 km/h'] = oneHundredTwenty;
  mergedObject['90 km/h'] = ninety;
  mergedObject['60 km/h'] = sixty;

  /* eslint-enable no-param-reassign, fp/no-mutation */
  return mergedObject;
};

export const requestAndStoreExposedPopulation = createAsyncThunk<
  AnalysisResult,
  ExposedPopulationDispatchParams,
  CreateAsyncThunkTypes
>(
  'analysisResultState/requestAndStoreExposedPopulation',
  async (params, api) => {
    const {
      exposure,
      date,
      extent,
      statistic,
      wfsLayerId,
      maskLayerId,
    } = params;

    const adminBoundaries = getBoundaryLayerSingleton();
    const adminBoundariesData = layerDataSelector(adminBoundaries.id)(
      api.getState(),
    ) as LayerData<BoundaryLayerProps>;

    const boundaryData = layerDataSelector(adminBoundaries.id)(
      api.getState(),
    ) as LayerData<BoundaryLayerProps> | undefined;
    const { id, key, calc } = exposure;

    const wfsLayer =
      wfsLayerId && (LayerDefinitions[wfsLayerId] as WMSLayerProps);
    const populationLayer = LayerDefinitions[id] as WMSLayerProps;

    const wfsParams: WfsRequestParams | undefined = wfsLayer
      ? {
          url: `${wfsLayer.baseUrl}/ows`,
          layer_name: wfsLayer.serverLayerName,
          time: getDateFormat(date, 'default'),
          key,
        }
      : undefined;

    let maskUrl: string | undefined;
    const maskLayer = maskLayerId
      ? (LayerDefinitions[maskLayerId] as WMSLayerProps)
      : undefined;

    if (maskLayer) {
      const { additionalQueryParams, baseUrl, serverLayerName } = maskLayer;

      const band = getStacBand(additionalQueryParams);

      const dateValue = !maskLayer.wcsConfig?.disableDateParam
        ? date
        : undefined;
      const dateString = getDateFormat(dateValue, 'default');

      // Get geotiff_url using STAC for layers in earthobservation.vam.
      // eslint-disable-next-line
      maskUrl =
        baseUrl.includes('api.earthobservation.vam.wfp.org/ows') &&
        !serverLayerName.includes('hf_water')
          ? await getDownloadGeotiffURL(
              serverLayerName,
              band,
              extent,
              dateString,
              api.dispatch,
            )
          : createGetCoverageUrl({
              bbox: extent,
              date,
              layerId: maskLayer.serverLayerName,
              url: maskLayer.baseUrl,
            });
    }
    const maskParams = maskUrl
      ? {
          mask_url: maskUrl,
          mask_calc_expr: calc || 'A*(B==1)',
        }
      : undefined;

    const apiRequest = await createAPIRequestParams(
      populationLayer,
      extent,
      date,
      api.dispatch,
      wfsParams,
      maskParams,
      // Set geojsonOut to true.
      // TODO - Remove the need for the geojson_out parameters. See TODO in zonal_stats.py.
      true,
    );

    const apiFeatures = ((await fetchApiData(
      ANALYSIS_API_URL,
      apiRequest,
      api.dispatch,
    )) || []) as Feature[];

    const { scale, offset } = populationLayer.wcsConfig ?? {
      scale: undefined,
      offset: undefined,
    };

    const features = apiFeatures
      .map(f => scaleFeatureStat(f, scale || 1, offset || 0, statistic))
      .filter(f => get(f.properties, statistic) != null);

    const featuresWithBoundaryProps = appendBoundaryProperties(
      adminBoundaries.adminCode,
      features,
      boundaryData!.data.features,
    );

    const collection: FeatureCollection = {
      type: 'FeatureCollection',
      features: featuresWithBoundaryProps,
    };

    const legend = createLegendFromFeatureArray(features, statistic);
    // TODO - use raster legend title
    const legendText = wfsLayer ? wfsLayer.title : 'Exposure Analysis';

    const tableColumns = generateTableColumnsFromApiData(
      featuresWithBoundaryProps,
      key,
    );

    let tableRows: TableRow[] = generateTableFromApiData(
      [statistic],
      featuresWithBoundaryProps,
      adminBoundariesData,
      apiRequest.group_by,
      null,
      [], // no extra columns
      true,
      key,
    );

    // If a key exists, we are likely running an exposure analysis for storms or earthquakes.
    // We need to merge the data returned by the API as it will be split
    // by category for each admin boundary.
    if (key) {
      // eslint-disable-next-line fp/no-mutation
      tableRows = Object.values(_groupBy(tableRows, 'name')).map(adminRows =>
        mergeTableRows(adminRows),
      );
    }

    return new ExposedPopulationResult(
      tableRows,
      collection,
      statistic,
      legend,
      legendText,
      apiRequest.group_by,
      key,
      date,
      tableColumns,
    );
  },
);

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
    exposureValue,
  } = params;
  const baselineData = layerDataSelector(baselineLayer.id)(
    api.getState(),
  ) as LayerData<AdminLevelDataLayerProps>;

  const { adminLevel } = baselineLayer as AdminLevelDataLayerProps;
  const adminBoundaries = getBoundaryLayersByAdminLevel(adminLevel);
  const adminBoundariesData = layerDataSelector(adminBoundaries.id)(
    api.getState(),
  ) as LayerData<BoundaryLayerProps>;

  if (!adminBoundariesData) {
    throw new Error('Boundary Layer not loaded!');
  }

  const apiRequest = await createAPIRequestParams(
    hazardLayer,
    extent,
    date,
    api.dispatch,
    baselineLayer,
    undefined,
    undefined,
    exposureValue,
  );

  const aggregateData = scaleAndFilterAggregateData(
    await fetchApiData(ANALYSIS_API_URL, apiRequest, api.dispatch),
    hazardLayer,
    statistic,
    threshold,
  );

  const getCheckedBaselineData = async (): Promise<BaselineLayerData> => {
    // if the baselineData doesn't exist, lets load it, otherwise check then load existing data.
    // similar code can be found at impact.ts
    if (baselineLayer.type === 'boundary') {
      return { features: adminBoundariesData.data, layerData: [] };
    }
    if (!baselineData && baselineLayer) {
      const { payload } = (await api.dispatch(
        loadLayerData({
          layer: baselineLayer,
          extent,
        } as LayerDataParams<AdminLevelDataLayerProps>),
      )) as { payload: { data?: BaselineLayerData } };

      return checkBaselineDataLayer(baselineLayer.id, payload?.data);
    }

    if (baselineData && baselineLayer) {
      return checkBaselineDataLayer(baselineLayer.id, baselineData.data);
    }

    return { features: adminBoundariesData.data, layerData: [] };
  };

  const loadedAndCheckedBaselineData: BaselineLayerData = await getCheckedBaselineData();

  const features = generateFeaturesFromApiData(
    aggregateData,
    loadedAndCheckedBaselineData,
    apiRequest.group_by,
    statistic,
  );

  // Create a legend based on statistic data to be used for admin level analsysis.
  const legend = createLegendFromFeatureArray(features, statistic);

  const enrichedStatistics: (
    | AggregationOperations
    | 'stats_intersect_area'
  )[] = [statistic];
  if (statistic === AggregationOperations['Area exposed']) {
    /* eslint-disable-next-line fp/no-mutating-methods */
    enrichedStatistics.push('stats_intersect_area');
  }

  const tableRows: TableRow[] = generateTableFromApiData(
    enrichedStatistics,
    aggregateData,
    adminBoundariesData,
    apiRequest.group_by,
    loadedAndCheckedBaselineData.layerData,
    [], // no extra columns
  );

  return new BaselineLayerResult(
    tableRows,
    {
      ...adminBoundariesData.data,
      features,
    },
    hazardLayer,
    // We use a hack to leverage boundary layers as baseline layers
    // Besides a few missing fields, we have all the necessary info.
    baselineLayer as AdminLevelDataLayerProps,
    statistic,
    threshold,
    legend,
    // we never use the raw api data besides for debugging. So lets not bother saving it in Redux for production
    process.env.NODE_ENV === 'production' ? undefined : aggregateData,
    date,
  );
});

export const requestAndStorePolygonAnalysis = createAsyncThunk<
  PolygonAnalysisResult,
  PolygonAnalysisDispatchParams,
  CreateAsyncThunkTypes
>('analysisResultState/requestAndStorePolygonAnalysis', async params => {
  const {
    adminLevel,
    adminLevelLayer,
    adminLevelData,
    hazardLayer,
    startDate,
    endDate,
  } = params;

  const classes = await fetchWMSLayerAsGeoJSON({
    lyr: hazardLayer,
    startDate,
    endDate,
  });

  const adminLevelName = getAdminNameProperty(adminLevel);

  const classProperties = hazardLayer?.zonal?.class_properties || ['label']; // eslint-disable-line camelcase

  const result = await calculate({
    // clone the data, so zone, class and stats properties can be safely added
    // without encountering an "object is not extensible" error
    zones: JSON.parse(JSON.stringify(adminLevelData)),
    zone_properties: [adminLevelName],
    classes: JSON.parse(JSON.stringify(classes)),
    class_properties: classProperties,
    dissolve_classes: true,
    preserve_features: false,
    remove_features_with_no_overlap: true,
    include_null_class_rows: false,
  });

  const tableColumns: Column[] = [
    { id: 'name', label: 'name' },
    { id: 'localName', label: 'localName' },
    ...(classProperties || []).map(classProperty => ({
      id: classProperty,
      label: classProperty,
    })),
    {
      id: PolygonalAggregationOperations.Area,
      label: PolygonalAggregationOperations.Area,
      format: value => getRoundedData(value as number),
    },
    {
      id: PolygonalAggregationOperations.Percentage,
      label: PolygonalAggregationOperations.Percentage,
      format: value => getRoundedData(value as number),
    },
  ];

  const zonalTableRows = result.table.rows.map((row: ZonalPolygonRow) => {
    return {
      area: Math.round(convertArea(row['stat:area'], 'meters', 'kilometers')),

      percentage: row['stat:percentage'],

      // other keys
      ...Object.fromEntries(
        Object.entries(row)
          // filter out statistic columns because they
          // are already included above
          .filter(entry => !entry[0].startsWith('stat:'))
          // remove prefix from column labels
          .map(([key, value]) => [key.replace(/^[a-z]+:/i, ''), value]),
      ),
    };
  });

  const tableRows: TableRow[] = generateTableFromApiData(
    [
      PolygonalAggregationOperations.Area,
      PolygonalAggregationOperations.Percentage,
    ], // statistics
    zonalTableRows, // aggregate data
    { layer: adminLevelLayer, data: adminLevelData },
    adminLevelName,
    null, // no baseline layer
    classProperties || [], // extra columns
  );

  const boundaryId = getAdminLevelLayer(adminLevel).id;

  return new PolygonAnalysisResult(
    tableRows,
    tableColumns,
    result.geojson,
    hazardLayer,
    adminLevel,
    PolygonalAggregationOperations.Percentage,
    boundaryId,
    undefined,
    startDate,
    endDate,
  );
});

export const analysisResultSlice = createSlice({
  name: 'analysisResultState',
  initialState,
  reducers: {
    setAnalysisResultSortByKey: (
      state,
      { payload }: PayloadAction<string | number>,
    ) => ({
      ...state,
      analysisResultDataSortByKey: payload,
    }),
    setAnalysisResultSortOrder: (
      state,
      { payload }: PayloadAction<'asc' | 'desc'>,
    ) => ({
      ...state,
      analysisResultDataSortOrder: payload,
    }),
    setExposureAnalysisResultSortByKey: (
      state,
      { payload }: PayloadAction<string | number>,
    ) => ({
      ...state,
      exposureAnalysisResultDataSortByKey: payload,
    }),
    setExposureAnalysisResultSortOrder: (
      state,
      { payload }: PayloadAction<'asc' | 'desc'>,
    ) => ({
      ...state,
      exposureAnalysisResultDataSortOrder: payload,
    }),
    setAnalysisLayerOpacity: (state, { payload }: PayloadAction<number>) => ({
      ...state,
      opacity: payload,
    }),
    setIsMapLayerActive: (state, { payload }: PayloadAction<boolean>) => ({
      ...state,
      isMapLayerActive: payload,
    }),
    setExposureLayerId: (state, { payload }: PayloadAction<string>) => ({
      ...state,
      exposureLayerId: payload,
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
      ): AnalysisResultState => {
        return {
          ...rest,
          result: payload as ExposedPopulationResult,
          isExposureLoading: false,
        };
      },
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

    builder.addCase(
      requestAndStorePolygonAnalysis.fulfilled,
      (
        { result, ...rest },
        { payload }: PayloadAction<PolygonAnalysisResult>,
      ): AnalysisResultState => ({
        ...rest,
        isLoading: false,
        result: payload as PolygonAnalysisResult,
      }),
    );

    builder.addCase(
      requestAndStorePolygonAnalysis.rejected,
      (state, action): AnalysisResultState => ({
        ...state,
        isLoading: false,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(
      requestAndStorePolygonAnalysis.pending,
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

export const analysisResultSortByKeySelector = (
  state: RootState,
): string | number => state.analysisResultState.analysisResultDataSortByKey;

export const analysisResultSortOrderSelector = (
  state: RootState,
): 'asc' | 'desc' => state.analysisResultState.analysisResultDataSortOrder;

export const exposureAnalysisResultSortByKeySelector = (
  state: RootState,
): string | number =>
  state.analysisResultState.exposureAnalysisResultDataSortByKey;

export const exposureAnalysisResultSortOrderSelector = (
  state: RootState,
): 'asc' | 'desc' =>
  state.analysisResultState.exposureAnalysisResultDataSortOrder;

export const exposureLayerIdSelector = (state: RootState): string =>
  state.analysisResultState.exposureLayerId;

export const analysisResultOpacitySelector = (state: RootState): number =>
  state.analysisResultState.opacity;

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
  setIsMapLayerActive,
  setIsDataTableDrawerActive,
  setAnalysisLayerOpacity,
  setExposureLayerId,
  setCurrentDataDefinition,
  hideDataTableDrawer,
  clearAnalysisResult,
  setAnalysisResultSortByKey,
  setAnalysisResultSortOrder,
  setExposureAnalysisResultSortByKey,
  setExposureAnalysisResultSortOrder,
} = analysisResultSlice.actions;

export default analysisResultSlice.reducer;
