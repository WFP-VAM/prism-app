import { getFormattedDate } from 'utils/date-utils';

/** Display range for UI (default date format); single label when same day in formatted output. */
export function buildBatchExportDatesDisplay(
  mapTimestampsUtc: readonly number[],
): string {
  if (mapTimestampsUtc.length === 0) {
    return '';
  }
  let minTs = mapTimestampsUtc[0];
  let maxTs = mapTimestampsUtc[0];
  for (let i = 1; i < mapTimestampsUtc.length; i += 1) {
    const ts = mapTimestampsUtc[i];
    if (ts < minTs) {
      minTs = ts;
    }
    if (ts > maxTs) {
      maxTs = ts;
    }
  }
  const startLabel = getFormattedDate(minTs, 'default') ?? '';
  const endLabel = getFormattedDate(maxTs, 'default') ?? '';
  if (startLabel === endLabel) {
    return startLabel;
  }
  return `${startLabel} — ${endLabel}`;
}
