import { AAFloodColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionFloodPanel/constants';
import { AAFloodRiskLevelType, FloodDateItem } from './types';

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
    case 'not exceeded':
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
      return 'Not exceeded';
  }
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
