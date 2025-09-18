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
  const riskLevel =
    (row.risk_level as AAFloodRiskLevelType) ?? 'Below bankfull';
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
      const highestSeverity = dateData.reduce((highest, current) => {
        const severityOrder = {
          Severe: 4,
          Moderate: 3,
          Bankfull: 2,
          'Below bankfull': 1,
        };
        const currentOrder = severityOrder[current.risk_level] || 0;
        const highestOrder = severityOrder[highest.risk_level] || 0;
        return currentOrder > highestOrder ? current : highest;
      }, dateData[0]);

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
