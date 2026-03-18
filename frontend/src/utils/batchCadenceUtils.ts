import { CoverageWindow, DatesPropagation } from 'config/types';

export type BatchCadence = 'monthly' | 'quarterly' | 'every-n-dekads';

function getMonthKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

function getQuarterKey(timestamp: number): string {
  const d = new Date(timestamp);
  const quarter = Math.floor(d.getUTCMonth() / 3);
  return `${d.getUTCFullYear()}-Q${quarter}`;
}

function getDekadKey(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getUTCDate();

  const dekad = day <= 10 ? 1 : day <= 20 ? 2 : 3;
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${dekad}`;
}

function getDekadIndex(day: number): number {
  return day <= 10 ? 0 : day <= 20 ? 1 : 2;
}

// For monthly cadence with a dekad coverage window, pick the date from each calendar
// month that falls in the "representative dekad": the dekad whose coverage window starts
// on the 1st of that month. For backward=2 this is the 21st, backward=1 → 11th, etc.
// Falls back to the first available date in the month if the target dekad is missing.
function filterMonthlyByDekadWindow(
  sortedDates: number[],
  backwardDekads: number,
): number[] {
  const targetDekadIndex = backwardDekads % 3;
  const byMonth = new Map<string, number[]>();
  for (const ts of sortedDates) {
    const key = getMonthKey(ts);
    if (!byMonth.has(key)) {
      byMonth.set(key, []);
    }
    byMonth.get(key)!.push(ts);
  }
  const result: number[] = [];
  for (const dates of byMonth.values()) {
    const match = dates.find(
      ts => getDekadIndex(new Date(ts).getUTCDate()) === targetDekadIndex,
    );
    result.push(match ?? dates[0]);
  }
  return result;
}

// For quarterly cadence with a dekad coverage window, pick the date from each calendar
// quarter whose coverage window starts on the 1st of the quarter. For backward=8 (9-dekad
// = 3-month window) this is the 21st of the third month of the quarter, etc.
// Falls back to the last available date in the quarter if the target is missing.
function filterQuarterlyByDekadWindow(
  sortedDates: number[],
  backwardDekads: number,
): number[] {
  const targetMonthInQuarter = Math.floor(backwardDekads / 3);
  const targetDekadIndex = backwardDekads % 3;
  const byQuarter = new Map<string, number[]>();
  for (const ts of sortedDates) {
    const key = getQuarterKey(ts);
    if (!byQuarter.has(key)) {
      byQuarter.set(key, []);
    }
    byQuarter.get(key)!.push(ts);
  }
  const result: number[] = [];
  for (const dates of byQuarter.values()) {
    const match = dates.find(ts => {
      const d = new Date(ts);
      return (
        d.getUTCMonth() % 3 === targetMonthInQuarter &&
        getDekadIndex(d.getUTCDate()) === targetDekadIndex
      );
    });
    // Fall back to the last date in the quarter (closest to the target dekad)
    result.push(match ?? dates[dates.length - 1]);
  }
  return result;
}

// Group dates by period key, return first date per period, filtered every nth period.
// 'every-n-dekads' with interval=1 returns one date per dekad (all available).
// For monthly/quarterly with a dekad coverage window, picks the date per period whose
// coverage window aligns with the full calendar month or quarter.
export function filterDatesByCadence(
  sortedDates: number[],
  cadence: BatchCadence,
  dekadInterval: number = 1,
  coverageWindow?: CoverageWindow,
): number[] {
  if (sortedDates.length === 0) {
    return [];
  }

  const backwardDekads =
    coverageWindow?.mode === DatesPropagation.DEKAD
      ? (coverageWindow.backward ?? 0)
      : undefined;

  if (cadence === 'monthly') {
    if (backwardDekads !== undefined) {
      return filterMonthlyByDekadWindow(sortedDates, backwardDekads);
    }
    const seenKeys = new Map<string, number>();
    for (const timestamp of sortedDates) {
      const key = getMonthKey(timestamp);
      if (!seenKeys.has(key)) {
        seenKeys.set(key, timestamp);
      }
    }
    return [...seenKeys.values()];
  }

  if (cadence === 'quarterly') {
    if (backwardDekads !== undefined) {
      return filterQuarterlyByDekadWindow(sortedDates, backwardDekads);
    }
    const seenKeys = new Map<string, number>();
    for (const timestamp of sortedDates) {
      const key = getQuarterKey(timestamp);
      if (!seenKeys.has(key)) {
        seenKeys.set(key, timestamp);
      }
    }
    return [...seenKeys.values()];
  }

  // every-n-dekads: collect first date per dekad, then keep every nth
  const seenKeys = new Map<string, number>();
  for (const timestamp of sortedDates) {
    const key = getDekadKey(timestamp);
    if (!seenKeys.has(key)) {
      seenKeys.set(key, timestamp);
    }
  }
  const uniqueDekadDates = [...seenKeys.values()];
  if (dekadInterval <= 1) {
    return uniqueDekadDates;
  }
  return uniqueDekadDates.filter((_, index) => index % dekadInterval === 0);
}

// Returns which cadences should be disabled given the available dates.
// - monthly: disabled if < 2 distinct calendar months
// - quarterly: disabled if < 2 distinct calendar quarters
// - every-n-dekads: disabled if < dekadInterval distinct dekad periods (N=1 never disabled)
export function getDisabledCadences(
  sortedDates: number[],
  dekadInterval: number = 1,
): Set<BatchCadence> {
  const disabled = new Set<BatchCadence>();

  const distinctMonths = new Set(sortedDates.map(getMonthKey));
  if (distinctMonths.size < 2) {
    disabled.add('monthly');
  }

  const distinctQuarters = new Set(sortedDates.map(getQuarterKey));
  if (distinctQuarters.size < 2) {
    disabled.add('quarterly');
  }

  if (dekadInterval > 1) {
    const distinctDekads = new Set(sortedDates.map(getDekadKey));
    if (distinctDekads.size < dekadInterval) {
      disabled.add('every-n-dekads');
    }
  }

  return disabled;
}
