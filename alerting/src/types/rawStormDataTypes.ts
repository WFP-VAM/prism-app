//TODO: Avoid duplication of code
// the code below is duplicated from /home/max/projets/prism-app/frontend/src/context/anticipatoryAction/AAStormStateSlice/types.ts
export enum WindState {
  monitoring = 'monitoring',
  ready = 'ready',
  activated_48 = 'activated_64',
  activated_64 = 'activated_118',
}
export type WindStateKey = keyof typeof WindState;

export enum WindStateActivated {
  activated_64 = '> 118 km/h',
  activated_48 = '> 89 km/h',
}
export type WindStateActivatedKey = keyof typeof WindStateActivated;

//TODO: Avoid duplication of code
// the code below is duplicated from /prism-app/frontend/src/context/anticipatoryAction/AAStormStateSlice/rawStormDataTypes.ts.
import { FeatureCollection, Point, Feature } from 'geojson';

export enum FeaturePropertyDataType {
  analysis = 'analysis',
  forecast = 'forecast',
}

interface FeatureProperties {
  time: string;
  [key: string]: any;
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
  polygon: any;
}

export interface LandfallInfo {
  landfall_time: string[];
  landfall_impact_district: string;
  landfall_impact_intensity: AACategoryLandfall[];
  landfall_leadtime_hours: [number, number];
  is_coastal: boolean;
}
/* storm data reponse body type */
export interface StormDataResponseBody {
  time_series: TimeSeries;
  landfall_detected: boolean;
  forecast_details: ForecastDetails;
  uncertainty_cone: FeatureProperties;
  landfall_info: LandfallInfo | {};
  ready_set_results?: {
    status: WindState;
    exposed_area_48kt: ExposedAreaStorm;
    exposed_area_64kt: ExposedAreaStorm;
    proba_48kt_20_5d: ExposedAreaStorm;
  };
}
