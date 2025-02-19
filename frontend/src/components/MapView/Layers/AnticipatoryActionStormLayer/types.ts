// Q - still needed or needs to be improved?
import { FeatureCollection, Point, Feature } from 'geojson';

export enum FeaturePropertyDataType {
  analysis = 'analysis',
  forecast = 'forecast',
}

interface FeatureProperty {
  data_type: FeaturePropertyDataType;
  time: string;
  development: string;
  // maximum_wind_speed: number;
  // maximum_wind_gust: number;
  // wind_buffer_48: any;
  // wind_buffer_64: any;
}

export interface TimeSeries extends FeatureCollection<Point, FeatureProperty> {}
export interface TimeSeriesFeature extends Feature<Point, FeatureProperty> {}
