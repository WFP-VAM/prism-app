import { AAFloodColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionFloodPanel/constants';
import { startCase } from 'lodash';

import {
  getFloodRiskSeverity,
  isForecastDateInWindow,
  parseFloodStatus,
  statusFromCombinations,
} from './floodStatus';
import {
  AAFloodPhase,
  AAFloodRiskLevelType,
  AAFloodSeverityKey,
  FloodDateItem,
  FloodStation,
  FloodTriggerCombination,
} from './types';

export { getFloodRiskSeverity, isForecastDateInWindow, parseFloodStatus };

export function getFloodRiskColor(riskLevel: AAFloodRiskLevelType): string {
  switch (riskLevel?.toLowerCase()) {
    case 'not exceeded':
      return AAFloodColors.riskLevels.notExceeded;
    case 'bankfull':
      return AAFloodColors.riskLevels.bankfull;
    case 'moderate':
      return AAFloodColors.riskLevels.moderate;
    case 'severe':
      return AAFloodColors.riskLevels.severe;
    default:
      return AAFloodColors.riskLevels.noData;
  }
}

export const getCircleBorderColor = (riskLevel: AAFloodRiskLevelType) => {
  switch (riskLevel?.toLowerCase()) {
    case 'severe':
      return AAFloodColors.borderColors.severe;
    case 'moderate':
      return AAFloodColors.borderColors.moderate;
    case 'bankfull':
      return AAFloodColors.borderColors.bankfull;
    default:
      return AAFloodColors.borderColors.notExceeded;
  }
};

// ---- Shared helpers for building state from API responses ----

export function normalizeFloodTriggerStatus(raw: string): AAFloodRiskLevelType {
  const parsed = parseFloodStatus(raw);
  if (!parsed.id) {
    return 'Not exceeded';
  }
  return parsed.severity;
}

export function buildAvailableFloodDatesFromDatesJson(
  datesData: Record<
    string,
    {
      trigger_status?: string;
      probabilities_file?: string;
      discharge_file?: string;
      station_summary_file?: string;
    }
  >,
): FloodDateItem[] {
  const dateKeys = Object.keys(datesData).filter(
    d => d && !Number.isNaN(new Date(`${d}T12:00:00Z`).getTime()),
  );

  const sortedDateKeys = [...dateKeys].sort();

  return sortedDateKeys
    .map(d => {
      const item = datesData[d] || {};
      const status = parseFloodStatus(
        String(item.trigger_status || ''),
      ).severity;
      const dt = new Date(`${d}T12:00:00Z`).getTime();
      return {
        displayDate: dt,
        queryDate: dt,
        color: getFloodRiskColor(status),
      } as FloodDateItem;
    })
    .filter(Boolean) as FloodDateItem[];
}

function fractionToPercent(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value * 100;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed * 100;
    }
  }
  return undefined;
}

function isExceeded(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

const PHASES = new Set<AAFloodPhase>(['activation', 'readiness']);
const SEVERITIES = new Set<AAFloodSeverityKey>([
  'severe',
  'moderate',
  'bankfull',
]);

function stationKey(row: Record<string, unknown>): string {
  return startCase(String(row.station_name || '').trim());
}

function parseWideSummaryRow(
  row: Record<string, unknown>,
  fallbackDate: string,
): FloodStation | null {
  const key = stationKey(row);
  if (!key || !row.longitude || !row.latitude) {
    return null;
  }
  const parsed = parseFloodStatus(String(row.trigger_status ?? ''));
  return {
    station_name: key,
    station_id: Number(row.station_id || 0),
    river_name: String(row.river_name || ''),
    longitude: Number(row.longitude ?? 0),
    latitude: Number(row.latitude ?? 0),
    forecast_issue_date: String(row.forecast_issue_date || fallbackDate),
    window_begin: String(row.window_begin || ''),
    window_end: String(row.window_end || ''),
    avg_bankfull_percentage: fractionToPercent(row.avg_bankfull_percentage),
    avg_moderate_percentage: fractionToPercent(row.avg_moderate_percentage),
    avg_severe_percentage: fractionToPercent(row.avg_severe_percentage),
    trigger_bankfull: fractionToPercent(row.trigger_bankfull),
    trigger_moderate: fractionToPercent(row.trigger_moderate),
    trigger_severe: fractionToPercent(row.trigger_severe),
    trigger_status: parsed.id ? parsed.severity : 'Not exceeded',
    floodStatus: parsed.id || 'not_exceeded',
    phase: parsed.phase,
  };
}

function parseCombination(
  row: Record<string, unknown>,
): FloodTriggerCombination | null {
  const phase = String(row.phase || '')
    .trim()
    .toLowerCase() as AAFloodPhase;
  const severity = String(row.severity || '')
    .trim()
    .toLowerCase() as AAFloodSeverityKey;
  if (!PHASES.has(phase) || !SEVERITIES.has(severity) || isBlank(row.trigger)) {
    return null;
  }
  return {
    phase,
    severity,
    windowBegin: String(row.window_begin || ''),
    windowEnd: String(row.window_end || ''),
    avgProbability: fractionToPercent(row.avg_probability) ?? 0,
    trigger: fractionToPercent(row.trigger) ?? null,
    exceeded: isExceeded(row.exceeded),
  };
}

function explicitStationStatus(rows: Record<string, unknown>[]): string {
  return rows.reduce((best, row) => {
    const parsed = parseFloodStatus(String(row.status ?? ''));
    if (!parsed.id) {
      return best;
    }
    return parsed.rank >= parseFloodStatus(best).rank ? parsed.id : best;
  }, '');
}

function parseLongSummary(
  rows: Record<string, unknown>[],
  fallbackDate: string,
): Record<string, FloodStation> {
  const grouped = new Map<string, Record<string, unknown>[]>();
  rows.forEach(row => {
    const key = stationKey(row);
    if (!key) {
      return;
    }
    grouped.set(key, [...(grouped.get(key) || []), row]);
  });

  const stations: Record<string, FloodStation> = {};
  grouped.forEach((groupRows, key) => {
    const head =
      groupRows.find(row => row.longitude && row.latitude) || groupRows[0];
    if (!head.longitude || !head.latitude) {
      return;
    }
    const combinations = groupRows
      .map(parseCombination)
      .filter((combo): combo is FloodTriggerCombination => combo !== null);
    const statusId =
      explicitStationStatus(groupRows) || statusFromCombinations(combinations);
    const parsed = parseFloodStatus(statusId);
    stations[key] = {
      station_name: key,
      station_id: Number(head.station_id || 0),
      river_name: String(head.river_name || ''),
      longitude: Number(head.longitude ?? 0),
      latitude: Number(head.latitude ?? 0),
      forecast_issue_date: String(head.forecast_issue_date || fallbackDate),
      trigger_status: parsed.severity,
      floodStatus: parsed.id || 'not_exceeded',
      phase: parsed.phase,
      combinations,
    };
  });
  return stations;
}

export function parseStationSummaryRows(
  rows: Record<string, unknown>[],
  fallbackDate: string,
): Record<string, FloodStation> {
  const usable = rows.filter(row => String(row.station_name || '').trim());
  const isLong = usable.some(row => String(row.phase || '').trim());
  if (isLong) {
    return parseLongSummary(usable, fallbackDate);
  }
  return usable.reduce((acc: Record<string, FloodStation>, row) => {
    const station = parseWideSummaryRow(row, fallbackDate);
    if (!station) {
      return acc;
    }
    return { ...acc, [station.station_name]: station };
  }, {});
}
