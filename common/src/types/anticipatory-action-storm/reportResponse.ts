import { FeatureCollection, Point, Feature, Geometry } from "geojson";
import { WindState } from "./windState";

export enum FeaturePropertyDataType {
  analysis = "analysis",
  forecast = "forecast",
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

export type TimeSeries = FeatureCollection<Point, TimeSerieFeatureProperty>;
export type AAStormTimeSeriesFeature = Feature<Point, TimeSerieFeatureProperty>;

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
  Severe = "severe tropical storm",
  Moderate = "moderate tropical storm",
}

/* ready_set_results types */
interface ExposedAreaStorm {
  affected_districts: string[];
  polygon: Geometry;
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
  uncertainty_cone: Geometry;
  landfall_info: LandfallInfo | Record<string, never>;
  ready_set_results?: {
    status: WindState;
    exposed_area_48kt: ExposedAreaStorm;
    exposed_area_64kt: ExposedAreaStorm;
    proba_48kt_20_5d: ExposedAreaStorm;
  };
}
