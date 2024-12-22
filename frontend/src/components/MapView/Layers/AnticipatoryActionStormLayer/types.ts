// Q - still needed or needs to be improved?
import { FeatureCollection, Point, Feature } from 'geojson';

interface FeatureProperty {
  data_type: 'analysis' | 'forecast';
  time: string;
  development: string;
  // maximum_wind_speed: number;
  // maximum_wind_gust: number;
  // wind_buffer_48: any;
  // wind_buffer_64: any;
}

export interface TimeSeries extends FeatureCollection<Point, FeatureProperty> {}
export interface TimeSeriesFeature extends Feature<Point, FeatureProperty> {}
