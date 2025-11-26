import GeoJSON, { FeatureCollection, Point } from 'geojson';
import { Dispatch } from 'redux';
import {
  PointData,
  PointLayerData,
  ReferenceDateTimestamp,
} from 'config/types';
import { oneDayInMs } from 'components/MapView/LeftPanel/utils';
import { FloodChartConfigObject } from 'context/tableStateSlice';
import { fetchWithTimeout } from './fetch-with-timeout';
import { getFormattedDate } from './date-utils';
import { DateFormat } from './name-utils';

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

/* eslint-disable camelcase */
export type EWSSensorData = {
  location_id: number;
  value: [string, number];
};

type EWSTriggerLevels = {
  warning: number;
  severe_warning: number;
  watch_level: number;
};
/* eslint-enable camelcase */

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
    // eslint-disable-next-line fp/no-mutating-methods
    datesArray.push(tempDate.getTime() as ReferenceDateTimestamp);

    tempDate.setTime(tempDate.getTime() + oneDayInMs);
  }

  return datesArray;
};

const fetchEWSLocations = async (
  baseUrl: string,
  dispatch: Dispatch,
): Promise<FeatureCollection> => {
  const url = `${baseUrl}/location.geojson?type=River`;
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

export const fetchEWSDataPointsByLocation = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
  externalId?: string,
): Promise<EWSSensorData[]> => {
  const endDate = new Date(date);
  endDate.setUTCHours(23, 59, 59, 999);
  // FIXME: pass start/end here? why the 24h delta?
  const startDate = new Date(endDate.getTime() - oneDayInMs);
  const format = DateFormat.ISO;

  const url = `${baseUrl}/sensors/sensor_event?start=${getFormattedDate(
    startDate,
    format,
  )}&end=${getFormattedDate(endDate, format)}`;

  const resource = externalId ? `${url}&external_id=${externalId}` : url;

  try {
    const resp = await fetchWithTimeout(
      resource,
      dispatch,
      {},
      `Request failed for fetching EWS data points by location at ${resource}`,
    );
    return await resp.json();
  } catch (error) {
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

export const fetchEWSData = async (
  baseUrl: string,
  date: number,
  dispatch: Dispatch,
): Promise<PointLayerData> => {
  const [locations, values] = await Promise.all([
    fetchEWSLocations(baseUrl, dispatch),
    fetchEWSDataPointsByLocation(baseUrl, date, dispatch),
  ]);

  const processedFeatures: PointData[] = locations.features.reduce(
    (pointDataArray, feature) => {
      const { properties, geometry } = feature;

      if (!properties) {
        return pointDataArray;
      }

      const locationValues: number[] = values
        .filter(v => v.location_id === properties.id)
        .map(v => v.value[1]);

      if (locationValues.length === 0) {
        return pointDataArray;
      }

      const mean =
        locationValues.reduce((acc, item) => acc + item, 0) /
        locationValues.length;
      const min = Math.min(...locationValues);
      const max = Math.max(...locationValues);

      const { coordinates } = geometry as Point;

      const pointData: PointData = {
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

      return [...pointDataArray, pointData];
    },
    [] as PointData[],
  );

  return GeoJSON.parse(processedFeatures, {
    Point: ['lat', 'lon'],
  }) as any as PointLayerData;
};

export const createEWSDatasetParams = (
  featureProperties: any,
  baseUrl: string,
) => {
  /* eslint-disable camelcase */
  const { name, external_id, trigger_levels } = featureProperties;
  const chartTitle = `River level - ${name} (${external_id})`;

  const parsedLevels = JSON.parse(trigger_levels);
  const triggerLevels = {
    watchLevel: parsedLevels.watch_level,
    warning: parsedLevels.warning,
    severeWarning: parsedLevels.severe_warning,
  };
  /* eslint-enable camelcase */
  return {
    // eslint-disable-next-line camelcase
    externalId: external_id,
    triggerLevels,
    chartTitle,
    baseUrl,
  };
};
