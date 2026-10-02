import {
  AAFloodPhase,
  AAFloodRiskLevelType,
  AAFloodSeverityKey,
  FloodTriggerCombination,
} from './types';

export type ParsedFloodStatus = {
  id: string;
  phase: AAFloodPhase | null;
  severity: AAFloodRiskLevelType;
  severityKey: AAFloodSeverityKey | null;
  rank: number;
};

const SEVERITY_LABEL: Record<AAFloodSeverityKey, AAFloodRiskLevelType> = {
  severe: 'Severe',
  moderate: 'Moderate',
  bankfull: 'Bankfull',
};

/**
 * Highest first. Legacy severity-only values rank with readiness of that severity
 * so old dates keep Severe > Moderate > Bankfull > Not exceeded.
 */
const STATUS_RANK: Record<string, number> = {
  activation_severe: 7,
  activation_moderate: 6,
  activation_bankfull: 5,
  readiness_severe: 4,
  severe: 4,
  readiness_moderate: 3,
  moderate: 3,
  readiness_bankfull: 2,
  bankfull: 2,
  not_exceeded: 1,
};

const EMPTY_STATUS: ParsedFloodStatus = {
  id: '',
  phase: null,
  severity: 'Not exceeded',
  severityKey: null,
  rank: 0,
};

export function canonicalizeFloodStatus(
  raw: string | null | undefined,
): string {
  const compact = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace('bank_full', 'bankfull');
  if (compact === 'notexceeded') {
    return 'not_exceeded';
  }
  return compact;
}

export function parseFloodStatus(
  raw: string | null | undefined,
): ParsedFloodStatus {
  const id = canonicalizeFloodStatus(raw);
  if (!id) {
    return EMPTY_STATUS;
  }
  const rank = STATUS_RANK[id];
  if (rank === undefined) {
    return { ...EMPTY_STATUS, id };
  }
  if (id === 'not_exceeded') {
    return {
      id,
      phase: null,
      severity: 'Not exceeded',
      severityKey: null,
      rank,
    };
  }
  const [phaseToken, severityToken] = id.split('_');
  if (phaseToken === 'activation' || phaseToken === 'readiness') {
    const severityKey = severityToken as AAFloodSeverityKey;
    return {
      id,
      phase: phaseToken,
      severity: SEVERITY_LABEL[severityKey],
      severityKey,
      rank,
    };
  }
  const severityKey = id as AAFloodSeverityKey;
  return {
    id,
    phase: null,
    severity: SEVERITY_LABEL[severityKey],
    severityKey,
    rank,
  };
}

export function getFloodRiskSeverity(
  riskLevel: AAFloodRiskLevelType | string | undefined,
): number {
  return parseFloodStatus(riskLevel).rank;
}

export function statusFromCombinations(
  combinations: FloodTriggerCombination[],
): string {
  return combinations.reduce((best, combo) => {
    if (!combo.exceeded) {
      return best;
    }
    const id = `${combo.phase}_${combo.severity}`;
    return parseFloodStatus(id).rank > parseFloodStatus(best).rank ? id : best;
  }, 'not_exceeded');
}

export function forecastDateKey(value: string): string {
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : text.slice(0, 10);
}

export function isForecastDateInWindow(
  time: string,
  begin: string,
  end: string,
): boolean {
  const day = forecastDateKey(time);
  const start = forecastDateKey(begin);
  const stop = forecastDateKey(end);
  if (!day || !start || !stop) {
    return false;
  }
  return day >= start && day <= stop;
}
