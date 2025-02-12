import { FeatureCollection, Point, Feature } from 'geojson';

export enum FeaturePropertyDataType {
  analysis = 'analysis',
  forecast = 'forecast',
}

/* timeserie types */
export interface TimeSerieFeatureProperty {
  data_type: FeaturePropertyDataType;
  time: string;
  development: string;
  // maximum_wind_speed: number;
  // maximum_wind_gust: number;
  // wind_buffer_48: any;
  // wind_buffer_64: any;
}

export interface TimeSeries
  extends FeatureCollection<Point, TimeSerieFeatureProperty> {}
export interface AAStormTimeSeriesFeature
  extends Feature<Point, TimeSerieFeatureProperty> {}

/* forcast-details types */
export interface ForecastDetails {
  basin: string;
  cyclone_name: string;
  event_id: string;
  reference_time: string;
  season: number;
}

/* landfall-info types */
export enum AACategoryLandfall {
  Severe = 'severe tropical storm',
  Moderate = 'moderate tropical storm',
}

/* ready_set_results types */
interface ExposedAreaStorm {
  affected_districts: string[];
  polygon: GeoJSON.Geometry;
}

export enum WindState {
  monitoring = 'monitoring',
  ready = 'ready',
  activated_48kt = 'activated_48kt',
  activated_64kt = 'activated_64kt',
}

/* storm data reponse body type */
export interface StormDataResponseBody {
  time_series: TimeSeries;
  landfall_detected: boolean;
  forecast_details: ForecastDetails;
  uncertainty_cone: GeoJSON.Geometry;
  landfall_info: {
    landfall_time: string[];
    landfall_impact_district: string;
    landfall_impact_intensity: AACategoryLandfall[];
  };
  ready_set_results?: {
    status: WindState;
    exposed_area_48kt: ExposedAreaStorm;
    exposed_area_64kt: ExposedAreaStorm;
    proba_48kt_20_5d: ExposedAreaStorm;
  };
}
