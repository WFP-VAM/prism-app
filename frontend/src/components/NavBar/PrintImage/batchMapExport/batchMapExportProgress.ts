import type { BatchMapExportJobRow } from './types';

export type BatchMapExportDisplayStatus =
  | 'queued'
  | 'running'
  | 'finishing'
  | 'succeeded'
  | 'failed';

export function getBatchMapExportProgressDisplay(job: BatchMapExportJobRow): {
  mapsCurrent: number;
  mapsTotal: number;
  barMode: 'determinate' | 'indeterminate';
  barValue: number;
  displayStatus: BatchMapExportDisplayStatus;
} {
  const hasProgress =
    job.progressCurrent != null &&
    job.progressTotalFromApi != null &&
    job.progressTotalFromApi > 0;

  const mapsCurrent = hasProgress
    ? Math.min(job.progressCurrent!, job.progressTotalFromApi!)
    : 0;

  const mapsTotal = hasProgress
    ? Math.max(job.progressTotalFromApi!, job.mapTotal, 1)
    : Math.max(job.mapTotal, 1);

  const mapsDone =
    hasProgress && job.progressCurrent! >= job.progressTotalFromApi!;

  let displayStatus: BatchMapExportDisplayStatus = 'queued';
  if (job.status === 'succeeded') {
    displayStatus = 'succeeded';
  } else if (job.status === 'failed') {
    displayStatus = 'failed';
  } else if (job.status === 'running') {
    displayStatus = mapsDone ? 'finishing' : 'running';
  }

  const succeeded = job.status === 'succeeded';

  return {
    mapsCurrent: succeeded ? mapsTotal : mapsCurrent,
    mapsTotal,
    // Indeterminate while queued/running — determinate bar only updates on poll ticks.
    barMode: succeeded ? 'determinate' : 'indeterminate',
    barValue: succeeded ? 100 : 0,
    displayStatus,
  };
}
