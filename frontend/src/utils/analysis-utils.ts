import {
  flatten,
  get,
  has,
  isNumber,
  isUndefined,
  omit,
  orderBy,
} from 'lodash';
import { Feature, FeatureCollection } from 'geojson';
import { createGetCoverageUrl } from 'prism-common';
import { TFunctionKeys } from 'i18next';
import { Dispatch } from 'redux';
import {
  AdminLevelDataLayerProps,
  AdminLevelType,
  AggregationOperations,
  aggregationOperationsToDisplay,
  AsyncReturnType,
  BoundaryLayerProps,
  ImpactLayerProps,
  LegendDefinition,
  StatsApi,
  ThresholdDefinition,
  WfsRequestParams,
  WMSLayerProps,
} from 'config/types';
import {
  Extent,
  GeoJsonBoundary,
} from 'components/MapView/Layers/raster-utils';
import { AdminLevelDataLayerData } from 'context/layers/admin_level_data';
import { LayerDefinitions } from 'config/utils';
import type { TableRow } from 'context/analysisResultStateSlice';
import { isLocalhost } from 'serviceWorker';
import {
  i18nTranslator,
  isEnglishLanguageSelected,
  useSafeTranslation,
} from 'i18n';
import { ANALYSIS_API_URL } from 'utils/constants';
import { getRoundedData } from './data-utils';
import {
  ANALYSIS_REQUEST_TIMEOUT,
  fetchWithTimeout,
} from './fetch-with-timeout';
import { getDateFormat } from './date-utils';

export type BaselineLayerData = AdminLevelDataLayerData;

export type Column = {
  id: keyof TableRow;
  label: string;
  format?: (value: number | string) => string;
};

const hasKeys = (obj: any, keys: string[]): boolean =>
  !keys.find(key => !has(obj, key));

const scaleValueIfDefined = (
  value: number,
  scale?: number,
  offset?: number,
) => {
  return scale !== undefined && offset !== undefined
    ? value * scale + offset
    : value;
};

function thresholdOrNaN(value: number, threshold?: ThresholdDefinition) {
  // filter out nullish values.
  if (!isNumber(value)) {
    return NaN;
  }

  // if there is no threshold, simply return the original value.
  if (threshold === undefined) {
    return value;
  }

  const isAbove =
    threshold.above === undefined ? true : value >= threshold.above;
  const isBelow =
    threshold.below === undefined ? true : value <= threshold.below;
  return isAbove && isBelow ? value : NaN;
}

function mergeFeaturesByProperty(
  baselineFeatures: Feature[],
  aggregateData: Array<object>,
  id: string,
): Feature[] {
  const features = baselineFeatures.map(feature1 => {
    const aggregateProperties = aggregateData.filter(
      item =>
        item &&
        // IDs need to be compared as strings to avoid 31 != "31".
        String(get(item, id)) === String(get(feature1, ['properties', id])),
    );

    const filteredProperties = aggregateProperties.map(filteredProperty => {
      // We use geometry from response. If not, use whole admin boundary.
      const filteredGeometry = get(filteredProperty, 'geometry');

      const propertyItems = filteredGeometry
        ? omit(filteredProperty, 'geometry')
        : filteredProperty;

      const properties = {
        ...get(feature1, 'properties'),
        ...propertyItems,
        impactValue: get(feature1, 'properties.data'),
      };

      const feature = filteredGeometry
        ? { ...feature1, geometry: filteredGeometry, properties }
        : { ...feature1, properties };

      return feature;
    });

    return filteredProperties;
  });

  return flatten(features);
}

export const checkBaselineDataLayer = (
  layerId: string,
  data: any,
): BaselineLayerData => {
  const isBaselineData = (maybeData: any): maybeData is BaselineLayerData =>
    hasKeys(maybeData, ['features', 'layerData']);

  if (isBaselineData(data)) {
    return data;
  }
  throw new Error(
    `Data for layer '${layerId}' does not appear to be valid baseline data.`,
  );
};

/* eslint-disable camelcase */
export type ApiData = {
  geotiff_url: ReturnType<typeof createGetCoverageUrl>; // helps developers get an understanding of what might go here, despite the type eventually being a string.
  zones_url: string;
  group_by: string;
  geojson_out?: boolean;
  wfs_params?: WfsRequestParams;
};

/* eslint-disable camelcase */
export type AlertRequest = {
  alert_name: string;
  alert_config: WMSLayerProps;
  email: string;
  max?: number;
  min?: number;
  prism_url: string;
  zones: object;
};

export function getPrismUrl(): string {
  const { origin } = window.location;
  if (isLocalhost) {
    // Special case - if we're testing locally, then assume we are testing prism-mongolia
    // This is to ensure we don't pollute the database with localhost URLs
    return 'https://prism-mongolia.org';
  }

  return origin;
}

export type KeyValueResponse = {
  [k in string]: string | number;
};

export const fetchApiData = async (
  url: string,
  apiData: ApiData | AlertRequest,
  dispatch: Dispatch,
): Promise<Array<KeyValueResponse | Feature>> => {
  return (
    await fetchWithTimeout(
      url,
      dispatch,
      {
        method: 'POST',
        cache: 'no-cache',
        timeout: ANALYSIS_REQUEST_TIMEOUT,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        // body data type must match "Content-Type" header
        body: JSON.stringify(apiData),
      },
      `Request failed fetching analysis api data at ${url}`,
    )
  )
    .text()
    .then(message => {
      try {
        return JSON.parse(message);
      } catch (e) {
        // In some cases the response isn't valid JSON.
        // In those cases, just wrap the full response in an object.
        return {
          message,
        };
      }
    });
};

export function scaleAndFilterAggregateData(
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  threshold: ThresholdDefinition,
): AsyncReturnType<typeof fetchApiData> {
  const { wcsConfig } = hazardLayerDef;
  const { scale, offset } = wcsConfig || {};

  return (aggregateData as KeyValueResponse[])
    .map(data => {
      return {
        ...data,
        [operation]: scaleValueIfDefined(
          get(data, `stats_${operation}`) as number,
          scale,
          offset,
        ),
      };
    })
    .filter(data => {
      return !Number.isNaN(
        thresholdOrNaN(data[operation] as number, threshold),
      );
    });
}

export function generateFeaturesFromApiData(
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  baselineData: AdminLevelDataLayerData,
  groupBy: StatsApi['groupBy'],
  operation: AggregationOperations,
): GeoJsonBoundary[] {
  const mergedFeatures = mergeFeaturesByProperty(
    baselineData.features.features,
    aggregateData,
    groupBy,
  );

  return mergedFeatures.filter(feature => {
    const value = get(feature, ['properties', operation]);
    return value !== undefined && !Number.isNaN(value);
  }) as GeoJsonBoundary[];
}

// Is this function still needed?
export async function loadFeaturesFromApi(
  layer: ImpactLayerProps,
  baselineData: BaselineLayerData,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  dispatch: Dispatch,
  extent?: Extent,
  date?: number,
): Promise<GeoJsonBoundary[]> {
  const wcsUrl = createGetCoverageUrl({
    bbox: extent,
    bboxDigits: 1,
    date,
    layerId: hazardLayerDef.serverLayerName,
    url: hazardLayerDef.baseUrl,
    version: hazardLayerDef.wcsConfig?.version,
  });

  const statsApi = layer.api as StatsApi;
  const apiUrl = statsApi.url || ANALYSIS_API_URL;

  const apiData = {
    geotiff_url: wcsUrl,
    zones_url: statsApi.zonesUrl,
    group_by: statsApi.groupBy,
    geojson_out: false,
  };

  const aggregateData = scaleAndFilterAggregateData(
    await fetchApiData(apiUrl, apiData, dispatch),
    hazardLayerDef,
    operation,
    layer.threshold,
  );

  return generateFeaturesFromApiData(
    aggregateData,
    baselineData,
    statsApi.groupBy,
    operation,
  );
}

export function quoteAndEscapeCell(value: number | string) {
  if (isUndefined(value)) {
    return '';
  }
  return `"${value.toString().replaceAll('"', '""')}"`;
}

export type AnalysisResult =
  | BaselineLayerResult
  | ExposedPopulationResult
  | PolygonAnalysisResult;

/**
 * Computes the feature property value according to the scale, offset values and statistic property
 *
 * @return Feature
 */
export function scaleFeatureStat(
  feature: Feature,
  scale: number,
  offset: number,
  statistic: AggregationOperations,
): Feature {
  const { properties } = feature;
  if (!properties) {
    return feature;
  }

  const value =
    get(properties, statistic) || get(properties, `stats_${statistic}`);

  const scaledValue: number = value && value * scale + offset;

  const scaledValueProperties = {
    ...properties,
    [statistic]: scaledValue,
  };
  const scaledValueFeature: Feature = {
    ...feature,
    properties: scaledValueProperties,
  };

  return scaledValueFeature;
}

/**
 * Creates Analysis result legend based on data returned from API.
 *
 * The equal interval method takes the maximum values minus the minimum
 * and divides the result by the number of classes, which is the length
 * of colors array.
 *
 * Finally the function calculates the upper end of each class interval
 * and assigns a color.
 *
 * @return LegendDefinition
 */
export function createLegendFromFeatureArray(
  features: Feature[],
  statistic: AggregationOperations,
): LegendDefinition {
  // Extract values based on aggregation operation.
  const stats: number[] = features.map(f =>
    f.properties && f.properties[statistic] ? f.properties[statistic] : 0,
  );

  const maxNum = Math.max(...stats);
  const minNum = Math.min(...stats);

  const colors = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
  const labels = ['Very low', 'Low', 'Medium', 'High', 'Very high'];

  const delta = (maxNum - minNum) / colors.length;

  return colors.map((color, index) => {
    const breakpoint =
      delta > 1
        ? Math.ceil(minNum + (index + 1) * delta)
        : minNum + (index + 1) * delta;

    // Make sure you don't have a value greater than maxNum.
    const value = Math.min(breakpoint, maxNum);
    /* eslint-disable fp/no-mutation */
    let formattedValue;
    if (statistic === AggregationOperations['Area exposed']) {
      formattedValue = `${(value * 100).toFixed(2)} %`;
    } else {
      formattedValue = `(${Math.round(value).toLocaleString('en-US')})`;
    }
    /* eslint-enable fp/no-mutation */

    return {
      value,
      color,
      label: {
        text: labels[index],
        value: formattedValue,
      },
    };
  });
}

export class ExposedPopulationResult {
  key: string;
  groupBy: string;
  featureCollection: FeatureCollection;
  legend: LegendDefinition;
  legendText: string;
  statistic: AggregationOperations;
  tableData: TableRow[];
  date: number;
  tableColumns: any;

  getTitle = (t?: i18nTranslator): string => {
    return t ? t('Population Exposure') : 'Population Exposure';
  };

  getStatTitle = (t?: i18nTranslator): string => {
    return this.getTitle(t);
  };

  getHazardLayer = (): WMSLayerProps => {
    return this.getHazardLayer();
  };

  constructor(
    tableData: TableRow[],
    featureCollection: FeatureCollection,
    statistic: AggregationOperations,
    legend: LegendDefinition,
    legendText: string,
    groupBy: string,
    key: string,
    date: number,
    tableColumns: any,
  ) {
    this.tableData = tableData;
    this.featureCollection = featureCollection;
    this.statistic = statistic;
    this.legend = legend;
    this.legendText = legendText;
    this.groupBy = groupBy;
    this.key = key;
    this.date = date;
    this.tableColumns = tableColumns;
  }
}

// not in analysisResultStateSlice to prevent import cycle
export class BaselineLayerResult {
  key: number = Date.now();
  featureCollection: FeatureCollection;
  tableData: TableRow[];
  // for debugging purposes only, as its easy to view the raw API response via Redux Devtools. Should be left empty in production
  private rawApiData?: object[];

  statistic: AggregationOperations;
  threshold: ThresholdDefinition;

  legend: LegendDefinition;
  legendText: string;
  hazardLayerId: WMSLayerProps['id'];
  baselineLayerId: AdminLevelDataLayerProps['id'] | BoundaryLayerProps['id'];
  boundaryId: AdminLevelDataLayerProps['boundary'];
  analysisDate?: ReturnType<Date['getTime']>;

  constructor(
    tableData: TableRow[],
    featureCollection: FeatureCollection,
    hazardLayer: WMSLayerProps,
    baselineLayer: AdminLevelDataLayerProps,
    statistic: AggregationOperations,
    threshold: ThresholdDefinition,
    legend?: LegendDefinition,
    rawApiData?: object[],
    analysisDate?: ReturnType<Date['getTime']>,
  ) {
    this.featureCollection = featureCollection;
    this.tableData = tableData;
    this.statistic = statistic;
    this.threshold = threshold;
    this.legend = baselineLayer.legend ?? legend;
    this.legendText = hazardLayer.legendText;
    this.rawApiData = rawApiData;

    this.hazardLayerId = hazardLayer.id;
    this.baselineLayerId = baselineLayer.id;
    this.boundaryId = baselineLayer.boundary;
    this.analysisDate = analysisDate;
  }

  getHazardLayer(): WMSLayerProps {
    return LayerDefinitions[this.hazardLayerId] as WMSLayerProps;
  }

  getBaselineLayer(): AdminLevelDataLayerProps {
    return LayerDefinitions[this.baselineLayerId] as AdminLevelDataLayerProps;
  }

  getStatTitle(t?: i18nTranslator): string {
    return t
      ? `${t(this.getHazardLayer().title)} (${t(
          aggregationOperationsToDisplay[this.statistic],
        )})`
      : `${this.getHazardLayer().title} (${
          aggregationOperationsToDisplay[this.statistic]
        })`;
  }

  getTitle(t?: i18nTranslator): string | undefined {
    const baselineLayer = this.getBaselineLayer();
    // If there is no title, we are using admin boundaries and return StatTitle instead.
    if (!baselineLayer.title) {
      return this.getStatTitle(t);
    }
    const baselineTitle = baselineLayer.title || 'Admin levels';
    return t
      ? `${t(baselineTitle)} ${t('exposed to')} ${t(
          this.getHazardLayer().title,
        )}`
      : `${baselineTitle} exposed to ${this.getHazardLayer().title}`;
  }
}

export function getAnalysisTableColumns(
  analysisResult?: AnalysisResult,
  withLocalName = false,
): Column[] {
  if (!analysisResult) {
    return [];
  }
  if ('tableColumns' in analysisResult) {
    return [
      {
        id: withLocalName ? 'localName' : 'name',
        label: 'Name',
      } as Column,
    ].concat(
      (analysisResult as PolygonAnalysisResult).tableColumns.filter(
        column => !['name', 'localName'].includes(column.id as string),
      ),
    );
  }
  const { statistic } = analysisResult;

  const analysisTableColumns: Column[] = [
    {
      id: withLocalName ? 'localName' : 'name',
      label: 'Name',
    },
    {
      id: statistic,
      label: aggregationOperationsToDisplay[statistic],
      format: (value: string | number) =>
        getRoundedData(value, undefined, 2, statistic),
    },
  ];

  if (statistic === AggregationOperations['Area exposed']) {
    /* eslint-disable-next-line fp/no-mutating-methods */
    analysisTableColumns.push({
      id: 'stats_intersect_area',
      label: 'Area exposed in sq km',
      format: (value: string | number) =>
        getRoundedData(value as number, undefined, 2, 'stats_intersect_area'),
    });
  }

  if (analysisResult instanceof ExposedPopulationResult) {
    const extraCols = analysisResult?.tableColumns.map((col: string) => ({
      id: col,
      label: col, // invert maps from computer name to display name.
      format: (value: string | number) => getRoundedData(value as number),
    })) as Column[];
    return [...analysisTableColumns, ...extraCols];
  }

  const baselineLayerTitle = analysisResult.getBaselineLayer().title;

  return [
    ...analysisTableColumns,
    // Remove data if no baseline layer is present
    ...(baselineLayerTitle
      ? [
          {
            id: 'baselineValue',
            label: baselineLayerTitle,
            format: (value: number | string) => value.toLocaleString('en-US'),
          },
        ]
      : []),
  ];
}

export function useAnalysisTableColumns(
  analysisResult?: AnalysisResult,
): {
  translatedColumns: Column[];
  analysisTableColumns: Column[];
} {
  const { t, i18n } = useSafeTranslation();
  const analysisTableColumns = getAnalysisTableColumns(
    analysisResult,
    !isEnglishLanguageSelected(i18n),
  );
  return {
    analysisTableColumns,
    translatedColumns: analysisTableColumns.map(col => ({
      ...col,
      label: t(col.label),
    })),
  };
}

export class PolygonAnalysisResult {
  key: number = Date.now();
  featureCollection: FeatureCollection;
  tableData: TableRow[];
  tableColumns: Column[];

  statistic: 'area' | 'percentage';
  threshold?: ThresholdDefinition;
  legend: LegendDefinition;
  legendText: string;
  hazardLayerId: WMSLayerProps['id'];
  adminLevel: AdminLevelType;
  boundaryId: string;
  startDate?: ReturnType<Date['getTime']>;
  endDate?: ReturnType<Date['getTime']>;

  constructor(
    tableData: TableRow[],
    tableColumns: Column[],
    featureCollection: FeatureCollection,
    hazardLayer: WMSLayerProps,
    adminLevel: AdminLevelType,
    statistic: 'area' | 'percentage',
    boundaryId: BoundaryLayerProps['id'],
    threshold?: ThresholdDefinition,
    startDate?: ReturnType<Date['getTime']>,
    endDate?: ReturnType<Date['getTime']>,
  ) {
    this.featureCollection = featureCollection;
    this.tableData = tableData;
    this.tableColumns = tableColumns;
    this.statistic = statistic;
    this.threshold = threshold;
    this.adminLevel = adminLevel;
    this.boundaryId = boundaryId;
    this.startDate = startDate;
    this.endDate = endDate;
    // color breaks from https://colorbrewer2.org/#type=sequential&scheme=Reds&n=5
    // this legend of red-like colors goes from very light to dark
    this.legend = [
      { label: '20%', value: 0.2, color: '#fee5d9' }, // very light red-orange, HSL: 0.05, 0.95, 0.92,
      { label: '40%', value: 0.4, color: '#fcae91' }, // rose bud, HSL: 0.05, 0.95, 0.78,
      { label: '60%', value: 0.6, color: '#fb6a4a' }, // red-orange, HSL: 0.03, 0.96, 0.64
      { label: '80%', value: 0.8, color: '#de2d26' }, // medium red-orange HSL: 0.01, 0.74, 0.51
      { label: '100%', value: 1, color: '#a50f15' }, // dark tamarillo red: 0.99 0.83 0.35, dark red
    ];

    this.legendText = hazardLayer.legendText;
    this.hazardLayerId = hazardLayer.id;
  }
  getHazardLayer(): WMSLayerProps {
    return LayerDefinitions[this.hazardLayerId] as WMSLayerProps;
  }

  getTitle(t?: i18nTranslator): string {
    return t
      ? `${t(this.getHazardLayer().title)} ${t('intersecting admin level')} ${t(
          (this.adminLevel as unknown) as TFunctionKeys,
        )}`
      : `${this.getHazardLayer().title} intersecting admin level ${
          this.adminLevel
        }`;
  }

  getStatTitle(t?: i18nTranslator): string {
    return t
      ? `${t(this.getHazardLayer().title)} (${t(this.statistic)})`
      : `${this.getHazardLayer().title} (${this.statistic})`;
  }
}

export function generateAnalysisFilename(
  analysisResult: TabularAnalysisResult,
  selectedDate: number | null,
) {
  const {
    hazardLayerId,
    threshold,
    statistic,
    key: createdAt,
  } = analysisResult;

  const aboveThreshold =
    threshold && threshold.above !== undefined ? threshold.above : undefined;
  const belowThreshold =
    threshold && threshold.below !== undefined ? threshold.below : undefined;
  const baselineLayerId =
    analysisResult instanceof BaselineLayerResult
      ? analysisResult.baselineLayerId
      : undefined;
  const adminLevel =
    analysisResult instanceof PolygonAnalysisResult
      ? analysisResult.adminLevel
      : undefined;

  const dateString = getDateFormat(selectedDate || createdAt, 'snake');

  return `analysis_${hazardLayerId}${
    baselineLayerId ? `_${baselineLayerId}` : ''
  }${adminLevel ? `_${adminLevel}` : ''}${
    aboveThreshold ? `_${aboveThreshold}` : ''
  }${belowThreshold ? `_${belowThreshold}` : ''}_${statistic}_${dateString}`;
}

export function downloadCSVFromTableData(
  analysisResult: TabularAnalysisResult,
  columns: Column[],
  selectedDate: number | null,
  sortByKey: Column['id'],
  sortOrder: 'asc' | 'desc',
) {
  const { tableData } = analysisResult;

  const sortedTableData = orderBy(tableData, sortByKey, sortOrder);

  // Built with https://stackoverflow.com/a/14966131/5279269
  const csvLines = [
    columns.map(col => quoteAndEscapeCell(col.label)).join(','),
    ...sortedTableData.map(row =>
      columns
        .map((column: Column) => {
          const value = row[column.id];
          if (value === undefined || value === null) {
            return '';
          }
          return column.format && typeof value === 'number'
            ? column.format(value)
            : quoteAndEscapeCell(value);
        })
        .join(','),
    ),
  ];
  const rawCsv = `data:text/csv;charset=utf-8,${csvLines.join('\n')}`;

  const encodedUri = encodeURI(rawCsv);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);

  link.setAttribute(
    'download',
    `${generateAnalysisFilename(analysisResult, selectedDate)}.csv`,
  );
  document.body.appendChild(link); // Required for FF

  link.click();
}

// type of results that have the tableData property
// and are displayed in the left-hand "RUN ANALYSIS" panel
export type TabularAnalysisResult = BaselineLayerResult | PolygonAnalysisResult;

/*
This function includes the feature properties of the boundary geojson layer within the analysis result one.
For each analysis feature, the algorithm find the boundary feature that exactly matches the adminCode identifier.
If there is a match, all the properties for both features are merged
*/
export const appendBoundaryProperties = (
  adminCodeId: BoundaryLayerProps['adminCode'],
  analysisFeatures: Feature[],
  boundaryLayerFeatures: Feature[],
): Feature[] => {
  const featuresWithBoundaryProps = analysisFeatures.reduce((acc, feature) => {
    const matchedFeature = boundaryLayerFeatures.find(
      boundaryLayerFeature =>
        boundaryLayerFeature.properties![adminCodeId] ===
        feature.properties![adminCodeId],
    );

    if (!matchedFeature) {
      return acc;
    }

    const newProps = { ...matchedFeature.properties!, ...feature.properties! };

    return [...acc, { ...feature, properties: newProps }];
  }, [] as Feature[]);

  return featuresWithBoundaryProps;
};
