// na/ny are not actually found in CSV, but defined not to cause confusion when calling the functions
import { DateItem } from 'config/types';

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

export const AAPanelCategories: AACategory[] = [
  AACategory.Severe,
  AACategory.Moderate,
];

export const AADisplayCategory: {
  [key in AACategory]?: string;
} = {
  [AACategory.Severe]: ' > 118 KM/H',
  [AACategory.Moderate]: ' > 89 KM/H',
};

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

export interface AAData {
  districtNames: string[];
  polygon: any;
}

export type DistrictDataType = {
  [key in AACategory]?: AAData;
};

export type AAStormData = {
  riskArea?: any;
  activeDistricts?: DistrictDataType;
  naDistricts?: DistrictDataType;
  landfall?: LandfallInfo;
  timeSeries?: any;
};

export type ResultType = {
  data: AAStormData;
  availableDates: DateItem[];
  range: { start?: string; end?: string };
};

interface ExposedAreaStorm {
  affected_districts: string[];
  polygon: any;
}

interface FeatureProperties {
  time: string;
  [key: string]: any;
}

interface Feature {
  properties: FeatureProperties;
  [key: string]: any;
}

interface TimeSeries {
  features: Feature[];
  [key: string]: any;
}

export interface LandfallInfo {
  district: string;
  time: string[];
  severity: AACategory[];
}

export interface StormData {
  time_series: TimeSeries;
  landfall_info: {
    landfall_time: string[];
    landfall_impact_district: string;
    landfall_impact_intensity: AACategoryLandfall[];
  };
  ready_set_results?: {
    exposed_area_48kt: ExposedAreaStorm;
    exposed_area_64kt: ExposedAreaStorm;
    proba_48kt_20_5d: ExposedAreaStorm;
  };
}

export const AAPhase = ['Active', 'na'] as const;
export type AAPhaseType = (typeof AAPhase)[number];
export const phaseValues = Object.values(AAPhase);

export enum AAView {
  Activation_trigger = 'Actication Trigger',
  Readiness_trigger = 'Readiness Trigger',
}

export type AnticipatoryActionState = {
  data: AAStormData;
  // availableDates used to update layer available dates after csv processed
  availableDates?: DateItem[] | undefined;
  filters: {
    viewType?: 'forecast' | 'risk' | undefined;
    selectedDate: string | undefined;
    selectedIndex: string;
    categories: Record<AACategory, boolean>;
  };
  loading: boolean;
  error: string | null;
};
