import { DateItem } from 'config/types';

// Extended DateItem for flood data with color coding
export type FloodDateItem = DateItem & {
  color?: string;
};

// Flood risk levels based on the sample data
export const AAFloodRiskLevels = [
  'Below bankfull',
  'Bankfull',
  'Moderate',
  'Severe',
] as const;
export type AAFloodRiskLevelType = (typeof AAFloodRiskLevels)[number];

// Flood station data structure based on the sample CSV
export interface FloodStationData {
  station_name: string;
  river_name: string;
  location_id: number;
  time: string;
  total_members: number;
  min_discharge: number;
  max_discharge: number;
  avg_discharge: number;
  non_null_values: number;
  zero_values: number;
  threshold_bankfull: number;
  threshold_moderate: number;
  threshold_severe: number;
  bankfull_exceeding: number;
  moderate_exceeding: number;
  severe_exceeding: number;
  bankfull_percentage: number;
  moderate_percentage: number;
  severe_percentage: number;
  risk_level: AAFloodRiskLevelType;
  max_vs_bankfull_pct: number;
  avg_vs_bankfull_pct: number;
}

export interface FloodStation {
  station_name: string;
  river_name: string;
  location_id: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  thresholds: {
    bankfull: number;
    moderate: number;
    severe: number;
  };
  currentData?: FloodStationData;
  allData: Record<string, FloodStationData>; // Store data for all dates
  historicalData: FloodStationData[];
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
  historicalData: Record<string, FloodStationData[]>;
  availableDates: FloodDateItem[];
  filters: {
    selectedDate: string | null;
    selectedStation: string | null;
    riskLevels: Record<AAFloodRiskLevelType, boolean>;
  };
  view: AAFloodView;
  loading: boolean;
  error: string | null;
};

export interface FloodProbabilityPoint {
  time: string;
  bankfull_percentage: number;
  moderate_percentage: number;
  severe_percentage: number;
}
