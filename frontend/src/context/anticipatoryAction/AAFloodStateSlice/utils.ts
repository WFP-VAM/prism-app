import { DateItem } from 'config/types';
import { FloodStation, FloodStationData, AAFloodRiskLevelType } from './types';

export function parseAndTransformFloodData(data: FloodStationData[]): {
  stations: FloodStation[];
  availableDates: DateItem[];
} {
  // Group data by station
  const stationMap = new Map<string, FloodStationData[]>();

  data.forEach(row => {
    const stationName = row.station_name;
    if (!stationName) {
      return;
    }
    if (!stationMap.has(stationName)) {
      stationMap.set(stationName, []);
    }
    stationMap.get(stationName)!.push(row);
  });

  // Create station objects
  const stations: FloodStation[] = Array.from(stationMap.entries()).map(
    ([stationName, stationData]) => {
      const firstData = stationData[0];
      const latestData = stationData[stationData.length - 1];

      return {
        station_name: stationName,
        river_name: firstData.river_name,
        location_id: firstData.location_id,
        thresholds: {
          bankfull: firstData.threshold_bankfull,
          moderate: firstData.threshold_moderate,
          severe: firstData.threshold_severe,
        },
        currentData: latestData,
        historicalData: stationData,
      };
    },
  );

  // Extract unique dates
  const uniqueDates = Array.from(new Set(data.map(row => row.time))).sort();

  const availableDates: DateItem[] = uniqueDates.map(dateStr => {
    const date = new Date(dateStr);
    return {
      displayDate: date.getTime(),
      queryDate: date.getTime(),
    };
  });

  return { stations, availableDates };
}

export function getFloodRiskLevel(
  discharge: number,
  thresholds: { bankfull: number; moderate: number; severe: number },
): AAFloodRiskLevelType {
  if (discharge >= thresholds.severe) {
    return 'Severe';
  } else if (discharge >= thresholds.moderate) {
    return 'Moderate';
  } else if (discharge >= thresholds.bankfull) {
    return 'Bankfull';
  } else {
    return 'Below bankfull';
  }
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
