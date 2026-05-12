import { getFormattedDate } from 'utils/date-utils';
import type { MapExportJobFormat } from 'utils/mapExportJobsApi';

const UNSAFE_FILENAME_CHARS = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);

export function sanitizeFilenamePart(input: string): string {
  const sanitized = input
    .trim()
    .split('')
    .map(ch => {
      const code = ch.charCodeAt(0);
      const isControl = code < 32 || code === 127;
      return isControl || UNSAFE_FILENAME_CHARS.has(ch) ? '_' : ch;
    })
    .join('');

  return sanitized.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

/** Single ``YYYY_MM_DD`` or ``start_to_end`` when range spans multiple formatted days. */
function buildBatchDateStem(startDate: number, endDate: number): string {
  const startDateStr = getFormattedDate(startDate, 'snake') ?? '';
  const endDateStr = getFormattedDate(endDate, 'snake') ?? '';
  if (startDateStr === endDateStr) {
    return startDateStr;
  }
  return `${startDateStr}_to_${endDateStr}`;
}

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

/** ``Country_layerId_[dateOrRange]`` stem (no extension). */
export function buildBatchExportFilenameBase(
  country: string,
  layerId: string,
  startDate: number,
  endDate: number,
): string {
  const safeCountry = sanitizeFilenamePart(country);
  const safeLayer = sanitizeFilenamePart(layerId);
  const dateStem = buildBatchDateStem(startDate, endDate);
  return `${safeCountry}_${safeLayer}_${dateStem}`;
}

/**
 * Filename range = min/max over maps actually queued (matches URL set),
 * not UI date picker alone.
 */
export function buildBatchArtifactBasenames(
  country: string,
  layerId: string,
  mapTimestampsUtc: readonly number[],
  format: MapExportJobFormat,
): { filenameBase: string; downloadFilename: string } {
  if (mapTimestampsUtc.length === 0) {
    throw new Error('buildBatchArtifactBasenames: empty map timestamps');
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
  const filenameBase = buildBatchExportFilenameBase(
    country,
    layerId,
    minTs,
    maxTs,
  );
  const ext = format === 'pdf' ? '.pdf' : '.zip';
  return { filenameBase, downloadFilename: `${filenameBase}${ext}` };
}
