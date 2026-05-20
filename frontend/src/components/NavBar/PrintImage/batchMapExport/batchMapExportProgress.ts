import type { BatchMapExportJobRow } from './types';

export function getBatchMapExportProgressDisplay(job: BatchMapExportJobRow): {
  mapsCurrent: number;
  mapsTotal: number;
  barMode: 'determinate' | 'indeterminate';
  barValue: number;
  finishing: boolean;
} {
  const mapsTotal = Math.max(job.mapTotal, job.progressTotalFromApi ?? 0, 1);

  if (job.status === 'succeeded') {
    return {
      mapsCurrent: mapsTotal,
      mapsTotal,
      barMode: 'determinate',
      barValue: 100,
      finishing: false,
    };
  }

  const hasProgress =
    job.progressCurrent != null &&
    job.progressTotalFromApi != null &&
    job.progressTotalFromApi > 0;

  const mapsCurrent = hasProgress
    ? Math.min(job.progressCurrent!, job.progressTotalFromApi!)
    : 0;

  const mapsRendered =
    hasProgress && job.progressCurrent! >= job.progressTotalFromApi!;

  // Determinate only fills in place on poll ticks — looks frozen while Running.
  // Keep the bar indeterminate for queued/running; show map counts in the label.
  const inProgress = job.status === 'queued' || job.status === 'running';

  if (inProgress) {
    return {
      mapsCurrent,
      mapsTotal: hasProgress
        ? Math.max(job.progressTotalFromApi!, job.mapTotal)
        : job.mapTotal || mapsTotal,
      barMode: 'indeterminate',
      barValue: 0,
      finishing: job.status === 'running' && mapsRendered,
    };
  }

  return {
    mapsCurrent: 0,
    mapsTotal: job.mapTotal || mapsTotal,
    barMode: 'indeterminate',
    barValue: 0,
    finishing: false,
  };
}
