import { oneDayInMs } from 'components/MapView/LeftPanel/utils';
import {
  PointData,
  PointLayerData,
  ReferenceDateTimestamp,
} from 'config/types';
import { FloodChartConfigObject } from 'context/tableStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import GeoJSON, { Feature, FeatureCollection, Point } from 'geojson';
import { Dispatch } from 'redux';

import { datesAreEqualWithoutTime } from './date-utils';
import {
  fetchWithTimeout,
  type FetchWithTimeoutOptions,
} from './fetch-with-timeout';
import { combineURLs, queryParamsToString } from './url-utils';

export const EWSTriggersConfig: FloodChartConfigObject = {
  normal: {
    label: 'Normal',
    color: '#1a9641',
  },
  watchLevel: {
    label: 'Watch level',
    color: '#f9d84e',
  },
  warning: {
    label: 'Warning',
    color: '#fdae61',
  },
  severeWarning: {
    label: 'Severe warning',
    color: '#e34a33',
  },
};

enum EWSLevelStatus {
  NORMAL = 0,
  WATCH = 1,
  WARNING = 2,
  SEVEREWARNING = 3,
}

export type EWSTriggerLevels = {
  warning: number;
  severe_warning: number;
  watch_level: number;
};

export type EWSSensorData = {
  location_id: number;
  value: [string, number];
};

type EWSWaterHeightPoint = {
  timestamp: number;
  water_height: number;
};

type EWSSensorDataFeatureProperties = {
  id: number;
  name: string;
  external_id: string;
  trigger_levels: EWSTriggerLevels;
  daily_min?: number;
  daily_max?: number;
  daily_mean?: number;
  status?: string;
  source?: string;
};

const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const EWS_WATER_HEIGHT_RETRIES = 3;
const EWS_WATER_HEIGHT_RETRY_DELAY_MS = 300;
const EWS_WATER_HEIGHT_CONCURRENCY = 6;
const EWS_SENSOR_DATA_CACHE_MS = 15 * 60 * 1000;
const EWS_API_KEY_MISSING_MESSAGE =
  'EWS token not set, contact site administrator.';

let sensorDataCache: {
  baseUrl: string;
  fetchedAt: number;
  data: FeatureCollection;
} | null = null;
let hasWarnedMissingEwsApiKey = false;

const sleep = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

const getEWSRequestInit = ({
  silent = false,
}: { silent?: boolean } = {}): FetchWithTimeoutOptions => {
  const apiKey = process.env.REACT_APP_EWS_API_KEY?.trim();
  const headers = apiKey ? { 'X-API-Key': apiKey } : undefined;

  return {
    headers,
    silent,
  };
};

const ensureEWSApiKey = (dispatch: Dispatch): boolean => {
  if (process.env.REACT_APP_EWS_API_KEY?.trim()) {
    return true;
  }

  if (!hasWarnedMissingEwsApiKey) {
    hasWarnedMissingEwsApiKey = true;
    dispatch(
      addNotification({
        message: EWS_API_KEY_MISSING_MESSAGE,
        type: 'warning',
      }),
    );
  }

  return false;
};

const runWithConcurrency = async (
  tasks: (() => Promise<void>)[],
  concurrency: number,
): Promise<void> => {
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await tasks[currentIndex]();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, runWorker),
  );
};

const isEWSTriggerLevels = (
  triggerLevels: unknown,
): triggerLevels is EWSTriggerLevels =>
  typeof triggerLevels === 'object' &&
  triggerLevels != null &&
  'watch_level' in triggerLevels &&
  'warning' in triggerLevels &&
  'severe_warning' in triggerLevels;

// generate an array with every day since the beginning
// of January 2021.
// input parameter is used here only for testing
export const createEWSDatesArray = (
  testEndDate?: number,
): ReferenceDateTimestamp[] => {
  const datesArray: ReferenceDateTimestamp[] = [];

  const now = new Date();

  const endDate = testEndDate
    ? new Date(testEndDate).setUTCHours(12, 0, 0, 0)
    : now.setUTCHours(12, 0, 0, 0);

  const tempDate = new Date('2021-01-01');
  tempDate.setUTCHours(12, 0, 0, 0);

  while (tempDate.getTime() <= endDate) {
    datesArray.push(tempDate.getTime() as ReferenceDateTimestamp);

    tempDate.setTime(tempDate.getTime() + oneDayInMs);
  }

  return datesArray;
};

const fetchEWSSensorData = async (
  baseUrl: string,
  dispatch: Dispatch,
): Promise<FeatureCollection> => {
  if (!ensureEWSApiKey(dispatch)) {
    return EMPTY_FEATURE_COLLECTION;
  }

  if (
    sensorDataCache &&
    sensorDataCache.baseUrl === baseUrl &&
    Date.now() - sensorDataCache.fetchedAt < EWS_SENSOR_DATA_CACHE_MS
  ) {
    return sensorDataCache.data;
  }

  const url = combineURLs(baseUrl, 'external/sensor-data');
  try {
    const resp = await fetchWithTimeout(
      url,
      dispatch,
      getEWSRequestInit(),
      `Request failed for fetching EWS sensor data at ${url}`,
    );
    const data = (await resp.json()) as FeatureCollection;
    const filteredData = {
      ...data,
      features: data.features.filter(
        feature => feature.properties?.source !== 'google',
      ),
    };
    sensorDataCache = {
      baseUrl,
      fetchedAt: Date.now(),
      data: filteredData,
    };
    return filteredData;
  } catch {
    return sensorDataCache?.data ?? EMPTY_FEATURE_COLLECTION;
  }
};

const fetchEWSWaterHeight = async (
  baseUrl: string,
  locationId: number,
  date: number,
  dispatch: Dispatch,
  { notifyOnFailure = false }: { notifyOnFailure?: boolean } = {},
): Promise<EWSWaterHeightPoint[]> => {
  if (!ensureEWSApiKey(dispatch)) {
    return [];
  }

  const endDate = new Date(date);
  endDate.setUTCHours(23, 59, 59, 999);
  const startDate = new Date(endDate.getTime() - oneDayInMs);
  const query = queryParamsToString(
    {
      location_id: String(locationId),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    },
    true,
  );
  const url = `${combineURLs(baseUrl, 'water-height')}?${query}`;
  const fetchErrorMessage = `Request failed for fetching EWS water height at ${url}`;

  for (let attempt = 0; attempt < EWS_WATER_HEIGHT_RETRIES; attempt += 1) {
    try {
      const resp = await fetchWithTimeout(
        url,
        dispatch,
        getEWSRequestInit({ silent: !notifyOnFailure }),
        fetchErrorMessage,
      );
      return await resp.json();
    } catch {
      if (attempt < EWS_WATER_HEIGHT_RETRIES - 1) {
        await sleep(EWS_WATER_HEIGHT_RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  return [];
};

export const fetchEWSDataPointsByLocation = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
  locationId: number,
): Promise<EWSSensorData[]> => {
  const points = await fetchEWSWaterHeight(
    baseUrl,
    locationId,
    date,
    dispatch,
    {
      notifyOnFailure: true,
    },
  );

  return points.map(point => ({
    location_id: locationId,
    value: [new Date(point.timestamp * 1000).toISOString(), point.water_height],
  }));
};

const getLevelStatus = (
  currentLevel: number,
  levels: EWSTriggerLevels,
): EWSLevelStatus => {
  if (currentLevel < levels.watch_level) {
    return EWSLevelStatus.NORMAL;
  }
  if (currentLevel < levels.warning) {
    return EWSLevelStatus.WATCH;
  }
  if (currentLevel < levels.severe_warning) {
    return EWSLevelStatus.WARNING;
  }
  return EWSLevelStatus.SEVEREWARNING;
};

const featureToPointData = (
  feature: Feature<Point, EWSSensorDataFeatureProperties>,
  date: number,
): PointData | null => {
  const { properties, geometry } = feature;

  if (!properties || !isEWSTriggerLevels(properties.trigger_levels)) {
    return null;
  }

  if (properties.status === 'inactive' || properties.daily_max == null) {
    return null;
  }

  const { coordinates } = geometry;

  return {
    lon: coordinates[0],
    lat: coordinates[1],
    date,
    mean: properties.daily_mean ?? properties.daily_max,
    min: properties.daily_min ?? properties.daily_max,
    max: properties.daily_max,
    id: properties.id,
    name: properties.name,
    external_id: properties.external_id,
    trigger_levels: properties.trigger_levels,
    status: getLevelStatus(properties.daily_max, properties.trigger_levels),
  };
};

const fetchEWSCurrentData = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
): Promise<PointLayerData> => {
  const sensorData = await fetchEWSSensorData(baseUrl, dispatch);
  const processedFeatures = sensorData.features
    .map(feature =>
      featureToPointData(
        feature as Feature<Point, EWSSensorDataFeatureProperties>,
        date,
      ),
    )
    .filter((feature): feature is PointData => feature != null);

  return GeoJSON.parse(processedFeatures, {
    Point: ['lat', 'lon'],
  }) as unknown as PointLayerData;
};

const fetchEWSHistoricalData = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
): Promise<PointLayerData> => {
  const sensorData = await fetchEWSSensorData(baseUrl, dispatch);
  const valuesByLocation = new Map<number, number[]>();

  await runWithConcurrency(
    sensorData.features
      .map(feature => feature.properties?.id as number | undefined)
      .filter((id): id is number => id != null)
      .map(locationId => async () => {
        const points = await fetchEWSWaterHeight(
          baseUrl,
          locationId,
          date,
          dispatch,
        );
        if (points.length > 0) {
          valuesByLocation.set(
            locationId,
            points.map(point => point.water_height),
          );
        }
      }),
    EWS_WATER_HEIGHT_CONCURRENCY,
  );

  const processedFeatures: PointData[] = [];

  for (const feature of sensorData.features) {
    const { properties, geometry } = feature;

    if (!properties || !isEWSTriggerLevels(properties.trigger_levels)) {
      continue;
    }

    const locationValues = valuesByLocation.get(properties.id as number) ?? [];
    if (locationValues.length === 0) {
      continue;
    }

    const mean =
      locationValues.reduce((acc, item) => acc + item, 0) /
      locationValues.length;
    const min = Math.min(...locationValues);
    const max = Math.max(...locationValues);
    const { coordinates } = geometry as Point;

    processedFeatures.push({
      lon: coordinates[0],
      lat: coordinates[1],
      date,
      mean: parseFloat(mean.toFixed(2)),
      min,
      max,
      id: properties.id,
      name: properties.name,
      external_id: properties.external_id,
      trigger_levels: properties.trigger_levels,
      status: getLevelStatus(max, properties.trigger_levels),
    });
  }

  return GeoJSON.parse(processedFeatures, {
    Point: ['lat', 'lon'],
  }) as unknown as PointLayerData;
};

export const fetchEWSData = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
): Promise<PointLayerData> => {
  if (datesAreEqualWithoutTime(date, Date.now())) {
    return fetchEWSCurrentData(baseUrl, date, dispatch);
  }

  return fetchEWSHistoricalData(baseUrl, date, dispatch);
};

export const clearEWSSensorDataCacheForTests = (): void => {
  sensorDataCache = null;
  hasWarnedMissingEwsApiKey = false;
};

export const createEWSDatasetParams = (
  featureProperties: {
    id: number;
    name: string;
    external_id: string;
    trigger_levels: EWSTriggerLevels;
  },
  baseUrl: string,
) => {
  const { name, external_id, id, trigger_levels } = featureProperties;
  const chartTitle = `River level - ${name} (${external_id})`;

  return {
    locationId: id,
    triggerLevels: {
      watchLevel: trigger_levels.watch_level,
      warning: trigger_levels.warning,
      severeWarning: trigger_levels.severe_warning,
    },
    chartTitle,
    baseUrl,
  };
};
