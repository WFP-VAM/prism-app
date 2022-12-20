import GeoJSON, { FeatureCollection, Point } from 'geojson';
import moment from 'moment';
import { PointData, PointLayerData } from '../config/types';

type EWSChartConfig = {
  label: string;
  color: string;
};

type EWSChartItem = EWSChartConfig & { values: number[] };

export type EWSChartConfigObject = { [key: string]: EWSChartConfig };
export type EWSChartItemsObject = { [key: string]: EWSChartItem };

export const EWSTriggersConfig: EWSChartConfigObject = {
  normal: {
    label: 'normal',
    color: '#1a9641',
  },
  watchLevel: {
    label: 'watch level',
    color: '#f9d84e',
  },
  warning: {
    label: 'warning',
    color: '#fdae61',
  },
  severeWarning: {
    label: 'severe warning',
    color: '#e34a33',
  },
};

type statsEWS = {
  max: number;
  mean: number;
  min: number;
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

export const createEWSDatesArray = (): number[] => {
  const datesArray = [];

  const endDate = moment(moment.utc().format('YYYY-MM-DD')).valueOf();

  const tempDate = moment('2021-01-01');

  while (tempDate.valueOf() <= endDate) {
    // eslint-disable-next-line fp/no-mutating-methods
    datesArray.push(tempDate.clone().set({ hour: 12 }).valueOf());

    tempDate.add(1, 'days');
  }

  return datesArray;
};

const fetchEWSLocations = async (
  baseUrl: string,
): Promise<FeatureCollection> => {
  const url = `${baseUrl}/location.geojson?type=River`;

  const resp = await fetch(url);
  const featureCollection: FeatureCollection = await resp.json();

  return featureCollection;
};

export const fetchEWSDataPointsByLocation = async (
  baseUrl: string,
  date: number,
  externalId?: string,
): Promise<EWSSensorData[]> => {
  const endDate = moment(date)
    .clone()
    .set({ hour: 23, minute: 59, second: 59 });
  const startDate = endDate.clone().subtract(1, 'days');
  const format = 'YYYY-MM-DDTHH:mm:ss';

  const url = `${baseUrl}/sensors/sensor_event?start=${startDate.format(
    format,
  )}&end=${endDate.format(format)}`;

  const resp = await fetch(
    externalId ? `${url}&external_id=${externalId}` : url,
  );
  const values: EWSSensorData[] = await resp.json();

  return values;
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
): Promise<PointLayerData> => {
  const [locations, values] = await Promise.all([
    fetchEWSLocations(baseUrl),
    fetchEWSDataPointsByLocation(baseUrl, date),
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

  return {
    features: GeoJSON.parse(processedFeatures, {
      Point: ['lat', 'lon'],
    }),
  };
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

  const ewsDatasetParams = {
    externalId: external_id,
    triggerLevels,
    chartTitle,
    baseUrl,
  };

  /* eslint-enable camelcase */

  return ewsDatasetParams;
};
