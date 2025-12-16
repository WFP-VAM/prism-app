import { Feature, Geometry, GeoJsonProperties } from 'geojson';
import { ForecastDetails, TimeSeries } from 'prism-common/';

export enum AACategory {
  Severe = 'Severe',
  Moderate = 'Moderate',
  Risk = 'Risk',
}

export enum AACategoryKey {
  Severe = 'exposed_area_64kt',
  Moderate = 'exposed_area_48kt',
  Proba = 'proba_48kt_20_5d',
}

export enum AACategoryLandfall {
  Severe = 'severe tropical storm',
  Moderate = 'moderate tropical storm',
}

export interface AAData {
  districtNames: string[];
  polygon: any;
}

export type DistrictDataType = {
  [key in AACategory]?: AAData;
};

export interface LandfallInfo {
  district: string;
  time: string[];
  severity: AACategory[];
}

export const AACategoryDataToLandfallMap: {
  [key in AACategoryLandfall]: AACategory;
} = {
  [AACategoryLandfall.Severe]: AACategory.Severe,
  [AACategoryLandfall.Moderate]: AACategory.Moderate,
};

export const AACategoryKeyToCategoryMap: {
  [key in AACategoryKey]: AACategory;
} = {
  [AACategoryKey.Severe]: AACategory.Severe,
  [AACategoryKey.Moderate]: AACategory.Moderate,
  [AACategoryKey.Proba]: AACategory.Risk,
};

export interface MergedFeatures<P = GeoJsonProperties> extends Feature<
  Geometry | null,
  P
> {
  geometry: Geometry | null;
}

/* parsed storm data type */
export type ParsedStormData = {
  readiness?: boolean;
  activeDistricts?: DistrictDataType;
  naDistricts?: DistrictDataType;
  landfall?: LandfallInfo;
  timeSeries?: TimeSeries;
  landfallDetected?: boolean;
  forecastDetails?: ForecastDetails;
  uncertaintyCone?: GeoJSON.Geometry;
  mergedGeoJSON?: {
    type: string;
    features: MergedFeatures[];
  };
};

export type ResultType = {
  data: ParsedStormData;
};
