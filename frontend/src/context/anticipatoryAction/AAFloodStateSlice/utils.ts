import {
  FloodStation,
  FloodStationData,
  AAFloodRiskLevelType,
  FloodDateItem,
} from './types';
import { getVillageCoordinates } from './villageCoordinates';

export function parseAndTransformFloodData(data: FloodStationData[]): {
  stations: FloodStation[];
  availableDates: FloodDateItem[];
} {
  // Group data by station
  const stationMap = new Map<string, FloodStationData[]>();

  data.forEach(row => {
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

      return {
        station_name: stationName,
        river_name: firstData.river_name,
        location_id: firstData.location_id,
        coordinates,
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

  // Extract unique dates with color coding based on highest severity
  // Filter out null/undefined/invalid dates first
  const validDates = data
    .map(row => row.time)
    .filter(
      time =>
        time && time.trim() !== '' && !Number.isNaN(new Date(time).getTime()),
    );

  // eslint-disable-next-line fp/no-mutating-methods
  const uniqueDates = Array.from(new Set(validDates)).sort();

  const availableDates: FloodDateItem[] = uniqueDates
    .map(dateStr => {
      const date = new Date(dateStr);

      // Double-check that the date is valid
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      // Find the highest severity level for this date
      const dateData = data.filter(row => row.time === dateStr);
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
        displayDate: date.getTime(),
        queryDate: date.getTime(),
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
