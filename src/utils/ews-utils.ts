import { FeatureCollection, Point } from 'geojson';
import moment from 'moment';
import { PointData } from '../config/types';

const BASE_URL = 'http://sms.ews1294.info/api/v1';

type statsEWS = {
  max: number;
  mean: number;
  min: number;
};

enum EWSLevelStatus {
  NORMAL = 0,
  WARNING = 1,
  SEVEREWARNING = 2,
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
  const endDate = moment(
    moment().utcOffset('+0700').format('YYYY-MM-DD'),
  ).valueOf(); // Asia/Phnom_Penh

  const tempDate = moment('2021-01-01');
  while (tempDate.valueOf() <= endDate) {
    // eslint-disable-next-line fp/no-mutating-methods
    datesArray.push(tempDate.valueOf());

    tempDate.add(1, 'days');
  }

  return datesArray;
};

const fetchEWSLocations = async (): Promise<FeatureCollection> => {
  const url = `${BASE_URL}/location.geojson?type=River`;

  const resp = await fetch(url);
  const featureCollection: FeatureCollection = await resp.json();

  return featureCollection;
};

export const fetchEWSDataPointsByLocation = async (
  date: number,
  externalId?: string,
): Promise<EWSSensorData[]> => {
  const momentDate = moment(date).utc();

  const startDate = momentDate.startOf('day').format();
  const endDate = momentDate.clone().endOf('day').format();

  const url = `${BASE_URL}/sensors/sensor_event?start=${startDate}&end=${endDate}`;

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
  if (currentLevel < levels.warning) {
    return EWSLevelStatus.NORMAL;
  }

  if (currentLevel >= levels.warning && currentLevel < levels.severe_warning) {
    return EWSLevelStatus.WARNING;
  }

  return EWSLevelStatus.SEVEREWARNING;
};

export const fetchEWSData = async (date: number): Promise<PointData[]> => {
  const [locations, values] = await Promise.all([
    fetchEWSLocations(),
    fetchEWSDataPointsByLocation(date),
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
          mean,
          properties.trigger_levels as EWSTriggerLevels,
        ),
      };

      return [...pointDataArray, pointData];
    },
    [] as PointData[],
  );

  return processedFeatures;
};
