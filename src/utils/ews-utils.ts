import { FeatureCollection, Point } from 'geojson';
import moment from 'moment';
import { PointData } from '../config/types';

const BASE_URL = 'http://sms.ews1294.info/api/v1';

type statsEWS = {
  max: number | null;
  mean: number | null;
  min: number | null;
};

/* eslint-disable camelcase */
type EWSSensorData = {
  location_id: number;
  value: [string, number];
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

const fetchEWSDataPoints = async (date: number): Promise<EWSSensorData[]> => {
  const momentDate = moment(date).utc();

  const startDate = momentDate.startOf('day').format();
  const endDate = momentDate.clone().endOf('day').format();

  const url = `${BASE_URL}/sensors/sensor_event?start=${startDate}&end=${endDate}`;

  const resp = await fetch(url);
  const values: EWSSensorData[] = await resp.json();

  return values;
};

const createEWSstats = (values: number[]): statsEWS => {
  if (values.length === 0) {
    return {
      mean: null,
      max: null,
      min: null,
    };
  }

  return {
    mean: values.reduce((acc, item) => acc + item, 0) / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  };
};

export const fetchEWSData = async (date: number): Promise<PointData[]> => {
  const [locations, values] = await Promise.all([
    fetchEWSLocations(),
    fetchEWSDataPoints(date),
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

      const statsProperties: statsEWS = createEWSstats(locationValues);

      const { coordinates } = geometry as Point;

      const pointData: PointData = {
        lon: coordinates[0],
        lat: coordinates[1],
        date,
        ...properties,
        ...statsProperties,
      };

      return [...pointDataArray, pointData];
    },
    [] as PointData[],
  );

  return processedFeatures;
};
