import { startCase } from 'lodash';
import {
  FloodStation,
  FloodStationData,
  AAFloodRiskLevelType,
  FloodDateItem,
} from './types';
import { getVillageCoordinates } from './villageCoordinates';

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(
    String(value ?? '')
      .toString()
      .replace(/,/g, ''),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFloodRow(row: any): FloodStationData {
  const time: string = String(row.time ?? '').trim();
  // Temporary fix for risk level
  // Eventually we should fix the data source
  const cleanedRisk = String(row.risk_level ?? '')
    .replace('Above ', '')
    .replace('Below moderate', 'Bankfull')
    .trim();
  const riskLevel = (
    cleanedRisk
      ? `${cleanedRisk.charAt(0).toUpperCase()}${cleanedRisk
          .slice(1)
          .toLowerCase()}`
      : 'Below bankfull'
  ) as AAFloodRiskLevelType;
  return {
    station_name: String(row.station_name ?? ''),
    river_name: String(row.river_name ?? ''),
    location_id: toNumber(row.location_id),
    time,
    total_members: toNumber(row.total_members),
    min_discharge: toNumber(row.min_discharge),
    max_discharge: toNumber(row.max_discharge),
    avg_discharge: toNumber(row.avg_discharge),
    non_null_values: toNumber(row.non_null_values),
    zero_values: toNumber(row.zero_values),
    threshold_bankfull: toNumber(row.threshold_bankfull),
    threshold_moderate: toNumber(row.threshold_moderate),
    threshold_severe: toNumber(row.threshold_severe),
    bankfull_exceeding: toNumber(row.bankfull_exceeding),
    moderate_exceeding: toNumber(row.moderate_exceeding),
    severe_exceeding: toNumber(row.severe_exceeding),
    bankfull_percentage: toNumber(row.bankfull_percentage),
    moderate_percentage: toNumber(row.moderate_percentage),
    severe_percentage: toNumber(row.severe_percentage),
    risk_level: riskLevel,
    max_vs_bankfull_pct: toNumber(row.max_vs_bankfull_pct),
    avg_vs_bankfull_pct: toNumber(row.avg_vs_bankfull_pct),
  };
}

export function parseAndTransformFloodData(data: FloodStationData[]): {
  stations: FloodStation[];
  availableDates: FloodDateItem[];
} {
  // Normalize incoming CSV rows to correct numeric types
  const normalizedData: FloodStationData[] = (data as any[]).map(
    normalizeFloodRow,
  );

  // Group data by station
  const stationMap = new Map<string, FloodStationData[]>();

  normalizedData.forEach(row => {
    const stationName = row.station_name;
    // Skip rows with invalid or missing station names
    if (!stationName || stationName.trim() === '') {
      return;
    }
    if (!stationMap.has(stationName)) {
      stationMap.set(stationName, []);
    }
    // eslint-disable-next-line fp/no-mutating-methods
    stationMap.get(stationName)!.push(row);
  });

  // Create station objects
  const stations: FloodStation[] = Array.from(stationMap.entries()).map(
    ([stationName, stationData]) => {
      const firstData = stationData[0];
      const latestData = stationData[stationData.length - 1];
      const coordinates = getVillageCoordinates(stationName) || undefined;

      // Create allData object with date as key
      const allData: Record<string, FloodStationData> = {};
      stationData.forEach(stationDataItem => {
        const dateKey = stationDataItem.time.replace(' 00:00:00', '');
        // eslint-disable-next-line fp/no-mutation
        allData[dateKey] = stationDataItem;
      });

      return {
        station_name: startCase(stationName),
        river_name: firstData.river_name,
        location_id: firstData.location_id,
        coordinates,
        thresholds: {
          bankfull: firstData.threshold_bankfull,
          moderate: firstData.threshold_moderate,
          severe: firstData.threshold_severe,
        },
        currentData: latestData,
        allData,
        historicalData: stationData,
      };
    },
  );

  // Extract unique dates with color coding based on highest severity
  // Filter out null/undefined/invalid dates first
  const validDates = normalizedData
    .map(row => row.time)
    .filter(
      time =>
        time && time.trim() !== '' && !Number.isNaN(new Date(time).getTime()),
    );

  // eslint-disable-next-line fp/no-mutating-methods
  const uniqueDates = Array.from(new Set(validDates)).sort();

  const availableDates: FloodDateItem[] = uniqueDates
    .map(dateStr => {
      // avoid timezone issues
      const date = new Date(dateStr.replace(' 00:00:00', ' 12:00:00'));

      // Double-check that the date is valid
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      // Find the highest severity level for this date
      const dateData = normalizedData.filter(row => row.time === dateStr);
      const highestSeverity = dateData.reduce(
        (highest, current) =>
          getFloodRiskSeverity(current.risk_level) >
          getFloodRiskSeverity(highest.risk_level)
            ? current
            : highest,
        dateData[0],
      );

      return {
        displayDate: date.setUTCHours(12, 0, 0, 0),
        queryDate: date.setUTCHours(12, 0, 0, 0),
        color: getFloodRiskColor(
          highestSeverity?.risk_level || 'Below bankfull',
        ),
      } as FloodDateItem;
    })
    .filter((dateItem): dateItem is FloodDateItem => dateItem !== null);

  return { stations, availableDates };
}

export function getFloodRiskLevel(
  discharge: number,
  thresholds: { bankfull: number; moderate: number; severe: number },
): AAFloodRiskLevelType {
  if (discharge >= thresholds.severe) {
    return 'Severe';
  }
  if (discharge >= thresholds.moderate) {
    return 'Moderate';
  }
  if (discharge >= thresholds.bankfull) {
    return 'Bankfull';
  }
  return 'Below bankfull';
}

export function getFloodRiskColor(riskLevel: AAFloodRiskLevelType): string {
  switch (riskLevel) {
    case 'Below bankfull':
      return '#4CAF50'; // Green
    case 'Bankfull':
      return '#FFC107'; // Yellow
    case 'Moderate':
      return '#FF9800'; // Orange
    case 'Severe':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
}

export function getFloodRiskSeverity(
  riskLevel: AAFloodRiskLevelType | string | undefined,
): number {
  switch (riskLevel) {
    case 'Severe':
      return 4;
    case 'Moderate':
      return 3;
    case 'Bankfull':
      return 2;
    case 'Below bankfull':
      return 1;
    default:
      return 0;
  }
}

// ---- Shared helpers for building state from API responses ----

export function normalizeFloodTriggerStatus(raw: string): AAFloodRiskLevelType {
  const s = String(raw || '').toLowerCase();
  switch (true) {
    case s === 'severe':
      return 'Severe';
    case s === 'moderate':
      return 'Moderate';
    case s === 'bankfull' || s === 'bank full':
      return 'Bankfull';
    default:
      return 'Below bankfull';
  }
}

export function buildAvailableFloodDatesFromDatesJson(
  datesData: Record<
    string,
    {
      trigger_status?: string;
      probabilities_file?: string;
      discharge_file?: string;
      avg_probabilities_file?: string;
    }
  >,
): FloodDateItem[] {
  const dateKeys = Object.keys(datesData).filter(
    d => d && !Number.isNaN(new Date(`${d}T12:00:00Z`).getTime()),
  );
  // eslint-disable-next-line fp/no-mutating-methods
  const sortedDateKeys = [...dateKeys].sort();

  return sortedDateKeys
    .map(d => {
      const item = datesData[d] || {};
      const status = normalizeFloodTriggerStatus(
        String(item.trigger_status || ''),
      );
      const dt = new Date(`${d}T12:00:00Z`).getTime();
      return {
        displayDate: dt,
        queryDate: dt,
        color: getFloodRiskColor(status),
      } as FloodDateItem;
    })
    .filter(Boolean) as FloodDateItem[];
}

export function buildStationsFromAvgProbabilities(
  avgProbRows: any[],
  date: string,
): FloodStation[] {
  const stationsMap = new Map<string, FloodStation>();

  avgProbRows.forEach((row: any) => {
    const name = startCase(String(row.station_name || '').trim());
    if (!name) {
      return;
    }
    const issueDate = String(row.forecast_issue_date || date);
    const riskLevel = normalizeFloodTriggerStatus(row.trigger_status);
    const longitude = Number(row.longitude ?? row.lon ?? 0);
    const latitude = Number(row.latitude ?? row.lat ?? 0);
    const stationData: FloodStationData = {
      station_name: name,
      river_name: String(row.river_name || ''),
      location_id: Number(row.station_id || 0),
      time: issueDate,
      total_members: 0,
      min_discharge: 0,
      max_discharge: 0,
      avg_discharge: 0,
      non_null_values: 0,
      zero_values: 0,
      threshold_bankfull: 0,
      threshold_moderate: 0,
      threshold_severe: 0,
      bankfull_exceeding: Number(row.avg_bankfull_percentage || 0),
      moderate_exceeding: Number(row.avg_moderate_percentage || 0),
      severe_exceeding: Number(row.avg_severe_percentage || 0),
      bankfull_percentage: Number(row.avg_bankfull_percentage || 0),
      moderate_percentage: Number(row.avg_moderate_percentage || 0),
      severe_percentage: Number(row.avg_severe_percentage || 0),
      risk_level: riskLevel,
      max_vs_bankfull_pct: 0,
      avg_vs_bankfull_pct: 0,
    };
    const dateKey = issueDate;
    const existing = stationsMap.get(name);
    if (existing) {
      // eslint-disable-next-line fp/no-mutation
      existing.allData[dateKey] = stationData;
      // eslint-disable-next-line fp/no-mutating-methods
      existing.historicalData.push(stationData);
      if (
        !existing.currentData ||
        existing.currentData.time < stationData.time
      ) {
        // eslint-disable-next-line fp/no-mutation
        existing.currentData = stationData;
      }
      if (
        !existing.coordinates &&
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        longitude !== 0 &&
        latitude !== 0
      ) {
        // eslint-disable-next-line fp/no-mutation
        existing.coordinates = { latitude, longitude };
      }
    } else {
      stationsMap.set(name, {
        station_name: name,
        river_name: stationData.river_name,
        location_id: stationData.location_id,
        coordinates:
          Number.isFinite(longitude) &&
          Number.isFinite(latitude) &&
          longitude !== 0 &&
          latitude !== 0
            ? { latitude, longitude }
            : undefined,
        thresholds: { bankfull: 0, moderate: 0, severe: 0 },
        currentData: stationData,
        allData: { [dateKey]: stationData },
        historicalData: [stationData],
      });
    }
  });

  return Array.from(stationsMap.values());
}
