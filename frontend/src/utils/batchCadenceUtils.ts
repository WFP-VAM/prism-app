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

// Group dates by period key, return first date per period, filtered every nth period.
// 'every-n-dekads' with interval=1 returns one date per dekad (all available).
export function filterDatesByCadence(
  sortedDates: number[],
  cadence: BatchCadence,
  dekadInterval: number = 1,
): number[] {
  if (sortedDates.length === 0) {
    return [];
  }

  if (cadence === 'monthly') {
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
