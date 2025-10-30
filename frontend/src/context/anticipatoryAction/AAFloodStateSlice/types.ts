import { DateItem } from 'config/types';

// Extended DateItem for flood data with color coding
export type FloodDateItem = DateItem & {
  color?: string;
};

// Flood risk levels based on the sample data
export const AAFloodRiskLevels = [
  'Not exceeded',
  'Bankfull',
  'Moderate',
  'Severe',
] as const;
export type AAFloodRiskLevelType = (typeof AAFloodRiskLevels)[number];

// Flood station data structure for the flood panel table
export interface FloodStationData {
  station_name: string;
  station_id: number;
  river_name: string;
  time: string;
  risk_level: AAFloodRiskLevelType;
}

export interface FloodStation {
  // Core station information (always present)
  station_name: string;
  station_id: number;
  river_name: string;
  longitude: number;
  latitude: number;
  // Optional forecast/summary data (present when loaded from summary data)
  forecast_issue_date?: string;
  window_begin?: string; // ISO date string
  window_end?: string; // ISO date string
  avg_bankfull_percentage?: number;
  avg_moderate_percentage?: number;
  avg_severe_percentage?: number;
  trigger_bankfull?: number | null;
  trigger_moderate?: number | null;
  trigger_severe?: number | null;
  trigger_status?: AAFloodRiskLevelType | null;
}

export interface FloodForecastData {
  station_name: string;
  time: string;
  ensemble_members: number[];
}

export enum AAFloodView {
  Home = 'home',
  Station = 'station',
  Forecast = 'forecast',
  Historical = 'historical',
}

export type AnticipatoryActionFloodState = {
  stations: FloodStation[];
  selectedStation: string | null;
  selectedDate: string | null;
  forecastData: Record<string, FloodForecastData[]>;
  probabilitiesData: Record<string, FloodProbabilityPoint[]>;
  stationSummaryData: Record<string, FloodStation | undefined>;
  availableDates: FloodDateItem[];
  view: AAFloodView;
  loading: boolean;
  error: string | null;
};

export interface FloodProbabilityPoint {
  time: string;
  bankfullPercentage: number;
  moderatePercentage: number;
  severePercentage: number;
  thresholdBankfull: number;
  thresholdModerate: number;
  thresholdSevere: number;
}
