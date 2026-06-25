import { oneDayInMs } from 'components/MapView/LeftPanel/utils';
import {
  PointData,
  PointLayerData,
  ReferenceDateTimestamp,
} from 'config/types';
import { FloodChartConfigObject } from 'context/tableStateSlice';
import GeoJSON, { FeatureCollection, Point } from 'geojson';
import { Dispatch } from 'redux';

import { fetchWithTimeout } from './fetch-with-timeout';
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

export type EWSSensorData = {
  location_id: number;
  value: [string, number];
};

type EWSTriggerLevels = {
  warning: number;
  severe_warning: number;
  watch_level: number;
};

type EWSWaterHeightPoint = {
  timestamp: number;
  water_height: number;
};

const EMPTY_LOCATIONS: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

let locationsCache: { baseUrl: string; data: FeatureCollection } | null = null;

const EWS_WATER_HEIGHT_RETRIES = 3;
const EWS_WATER_HEIGHT_RETRY_DELAY_MS = 300;
const EWS_WATER_HEIGHT_CONCURRENCY = 6;

const sleep = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

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

const fetchEWSLocations = async (
  baseUrl: string,
  dispatch: Dispatch,
): Promise<FeatureCollection> => {
  if (locationsCache?.baseUrl === baseUrl) {
    return locationsCache.data;
  }

  const url = combineURLs(baseUrl, 'sensor-locations');
  try {
    const resp = await fetchWithTimeout(
      url,
      dispatch,
      {},
      `Request failed for fetching EWS locations at ${url}`,
    );
    const data = (await resp.json()) as FeatureCollection;
    locationsCache = {
      baseUrl,
      data: {
        ...data,
        features: data.features.filter(
          feature => feature.properties?.source !== 'google',
        ),
      },
    };
    return locationsCache.data;
  } catch {
    return EMPTY_LOCATIONS;
  }
};

const fetchEWSWaterHeight = async (
  baseUrl: string,
  locationId: number,
  date: number,
  dispatch: Dispatch,
  { notifyOnFailure = false }: { notifyOnFailure?: boolean } = {},
): Promise<EWSWaterHeightPoint[]> => {
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
        { silent: !notifyOnFailure },
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

export const fetchEWSData = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
): Promise<PointLayerData> => {
  const locations = await fetchEWSLocations(baseUrl, dispatch);
  const valuesByLocation = new Map<number, number[]>();

  await runWithConcurrency(
    locations.features
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

  for (const feature of locations.features) {
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
      ...properties,
      status: getLevelStatus(max, properties.trigger_levels),
    });
  }

  return GeoJSON.parse(processedFeatures, {
    Point: ['lat', 'lon'],
  }) as any as PointLayerData;
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
