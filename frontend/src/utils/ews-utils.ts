import { oneDayInMs } from 'components/MapView/LeftPanel/utils';
import {
  PointData,
  PointLayerData,
  ReferenceDateTimestamp,
} from 'config/types';
import { FloodChartConfigObject } from 'context/tableStateSlice';
import GeoJSON, { FeatureCollection, Point } from 'geojson';
import { chunk } from 'lodash';
import { Dispatch } from 'redux';

import { fetchWithTimeout } from './fetch-with-timeout';

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

// A single water-height reading from the EWS-1294 `water-height` endpoint.
// `timestamp` is seconds since the epoch and `water_height` is in millimetres.
export type EWSWaterHeightData = {
  timestamp: number;
  water_height: number;
};

type EWSTriggerLevels = {
  warning: number;
  severe_warning: number;
  watch_level: number;
};

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
  const url = `${baseUrl}/sensor-locations`;
  try {
    const resp = await fetchWithTimeout(
      url,
      dispatch,
      {},
      `Request failed for fetching EWS locations at ${url}`,
    );
    return await resp.json();
  } catch {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
};

// Fetch the water-height time series for a single sensor over a date window.
// The EWS-1294 `water-height` endpoint requires a numeric `location_id` and
// ISO-8601 `start_date`/`end_date`; it returns an array of readings, or an
// error object for invalid requests (guarded by the Array.isArray check).
export const fetchEWSWaterHeight = async (
  baseUrl: string,
  locationId: number,
  startDate: Date,
  endDate: Date,
  dispatch?: Dispatch,
): Promise<EWSWaterHeightData[]> => {
  const url = `${baseUrl}/water-height?location_id=${locationId}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`;

  try {
    const resp = await fetchWithTimeout(
      url,
      dispatch,
      {},
      `Request failed for fetching EWS water height at ${url}`,
    );
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (_error) {
    return [];
  }
};

const getLevelStatus = (
  currentLevel: number,
  levels: EWSTriggerLevels,
): EWSLevelStatus => {
  if (currentLevel < levels.watch_level) {
    return EWSLevelStatus.NORMAL;
  }

  if (currentLevel >= levels.watch_level && currentLevel < levels.warning) {
    return EWSLevelStatus.WATCH;
  }

  if (currentLevel >= levels.warning && currentLevel < levels.severe_warning) {
    return EWSLevelStatus.WARNING;
  }

  return EWSLevelStatus.SEVEREWARNING;
};

// Statuses for which the provider does not record water-height data, so we
// skip the per-sensor time-series request for them (matching ews1294.com).
const INACTIVE_EWS_STATUSES = ['inactive', 'planned'];

// The water-height endpoint is per-location, so the map layer fans out one
// request per sensor. The ews1294.com origin returns 504s under a large burst
// of concurrent requests, so cap how many run at once.
const EWS_FETCH_CONCURRENCY = 6;

export const fetchEWSData = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
): Promise<PointLayerData> => {
  const locations = await fetchEWSLocations(baseUrl, dispatch);

  const endDate = new Date(date);
  endDate.setUTCHours(23, 59, 59, 999);
  const startDate = new Date(endDate.getTime() - oneDayInMs);

  const features = locations.features.filter(
    feature =>
      feature.properties &&
      !INACTIVE_EWS_STATUSES.includes(feature.properties.status) &&
      // 'google' sensors are served by a different endpoint (google-forecast)
      // and 400 on water-height; they belong to the Google Flood loader.
      feature.properties.source !== 'google',
  );

  const processFeature = async (
    feature: FeatureCollection['features'][number],
  ): Promise<PointData | null> => {
    const { properties, geometry } = feature;

    if (!properties) {
      return null;
    }

    // No dispatch is passed: a failed per-sensor request is expected (the
    // origin may 504 for some sensors) and is handled by skipping the sensor,
    // so it must not raise a user-facing notification.
    const values = await fetchEWSWaterHeight(
      baseUrl,
      properties.id,
      startDate,
      endDate,
    );
    const locationValues = values.map(v => v.water_height);

    if (locationValues.length === 0) {
      return null;
    }

    const mean =
      locationValues.reduce((acc, item) => acc + item, 0) /
      locationValues.length;
    const min = Math.min(...locationValues);
    const max = Math.max(...locationValues);

    const { coordinates } = geometry as Point;

    return {
      lon: coordinates[0],
      lat: coordinates[1],
      date,
      mean: parseFloat(mean.toFixed(2)),
      min,
      max,
      ...properties,
      status: getLevelStatus(
        max,
        properties.trigger_levels as EWSTriggerLevels,
      ),
    };
  };

  // Fetch in concurrency-capped batches to avoid overwhelming the origin.
  const processedFeatures: (PointData | null)[] = [];

  for (const batch of chunk(features, EWS_FETCH_CONCURRENCY)) {
    processedFeatures.push(...(await Promise.all(batch.map(processFeature))));
  }

  return GeoJSON.parse(
    processedFeatures.filter((p): p is PointData => p !== null),
    {
      Point: ['lat', 'lon'],
    },
  ) as any as PointLayerData;
};

export const createEWSDatasetParams = (
  featureProperties: any,
  baseUrl: string,
) => {
  const { id, name, external_id, trigger_levels } = featureProperties;
  const chartTitle = `River level - ${name} (${external_id})`;

  // trigger_levels is now an object on the sensor-locations payload
  // (it used to be a JSON string on the legacy API).
  const triggerLevels = {
    watchLevel: trigger_levels.watch_level,
    warning: trigger_levels.warning,
    severeWarning: trigger_levels.severe_warning,
  };

  return {
    locationId: id,
    externalId: external_id,
    triggerLevels,
    chartTitle,
    baseUrl,
  };
};
