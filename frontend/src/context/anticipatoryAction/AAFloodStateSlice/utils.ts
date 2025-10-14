import {
  FloodStation,
  AAFloodRiskLevelType,
  FloodDateItem,
  FloodAvgProbabilities,
} from './types';

export function getFloodRiskColor(riskLevel: AAFloodRiskLevelType): string {
  switch (riskLevel?.toLowerCase()) {
    case 'below bankfull':
      return '#4CAF50'; // Green
    case 'bankfull':
      return '#FFC107'; // Yellow
    case 'moderate':
      return '#FF9800'; // Orange
    case 'severe':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
}

export function getFloodRiskSeverity(
  riskLevel: AAFloodRiskLevelType | string | undefined,
): number {
  switch (riskLevel?.toLowerCase()) {
    case 'severe':
      return 4;
    case 'moderate':
      return 3;
    case 'bankfull':
      return 2;
    case 'below bankfull':
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
  avgProbabilities: Record<string, FloodAvgProbabilities | undefined>,
  _date: string,
): FloodStation[] {
  const stationsMap = new Map<string, FloodStation>();

  Object.keys(avgProbabilities).forEach(name => {
    const row = avgProbabilities[name];
    if (!row) {
      return;
    }
    const longitude = Number(row.longitude ?? 0);
    const latitude = Number(row.latitude ?? 0);

    if (!stationsMap.has(name)) {
      stationsMap.set(name, {
        station_name: name,
        river_name: String(row.river_name || ''),
        station_id: Number(row.station_id || 0),
        coordinates:
          Number.isFinite(longitude) &&
          Number.isFinite(latitude) &&
          longitude !== 0 &&
          latitude !== 0
            ? { latitude, longitude }
            : undefined,
      });
    }
  });

  return Array.from(stationsMap.values());
}
