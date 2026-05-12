import { EXPORT_MAP_JOBS_API_URL } from './constants';

export type MapExportJobFormat = 'pdf' | 'png';

export interface MapExportJobRequestBody {
  urls: string[];
  viewportWidth: number;
  viewportHeight: number;
  format: MapExportJobFormat;
}

export interface MapExportJobCreateResponse {
  job_id: string;
  status: string;
  request_fingerprint: string;
  origin_url: string | null;
  deduplicated: boolean;
}

export interface MapExportJobErrorPayload {
  message?: string;
  type?: string;
}

export interface MapExportJobStatusResponse {
  job_id: string;
  status: string;
  request_fingerprint?: string;
  origin_url?: string | null;
  download_url: string | null;
  local_artifact_path?: string | null;
  error: MapExportJobErrorPayload | null;
  progress_current?: number | null;
  progress_total?: number | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function createMapExportJob(
  body: MapExportJobRequestBody,
): Promise<MapExportJobCreateResponse> {
  const response = await fetch(EXPORT_MAP_JOBS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }
  return JSON.parse(text) as MapExportJobCreateResponse;
}

export async function getMapExportJobStatus(
  jobId: string,
): Promise<MapExportJobStatusResponse> {
  const response = await fetch(`${EXPORT_MAP_JOBS_API_URL}/${jobId}`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }
  return JSON.parse(text) as MapExportJobStatusResponse;
}

function exportFailureMessage(job: MapExportJobStatusResponse): string {
  const raw = job.error;
  if (raw && typeof raw.message === 'string' && raw.message.length > 0) {
    return raw.message;
  }
  return 'Export failed';
}

export interface WaitForMapExportJobOptions {
  /** Polling interval when job is queued or running (ms). Default 2000. */
  pollIntervalMs?: number;
  /** Max time to wait for succeeded + download_url (ms). Default 2 hours. */
  maxWaitMs?: number;
  onStatus?: (status: string) => void;
  /** Full job payload each poll (progress, status, errors). */
  onJobUpdate?: (job: MapExportJobStatusResponse) => void;
  signal?: AbortSignal;
}

/**
 * Poll GET until succeeded (download_url) or failed/timeout.
 */
export async function waitForMapExportJobDownloadUrl(
  jobId: string,
  options: WaitForMapExportJobOptions = {},
): Promise<string> {
  const pollIntervalMs = options.pollIntervalMs ?? 2000;
  const maxWaitMs = options.maxWaitMs ?? 120 * 60 * 1000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const job = await getMapExportJobStatus(jobId);
    options.onStatus?.(job.status);
    options.onJobUpdate?.(job);

    if (job.status === 'succeeded') {
      const downloadUrl = job.download_url;
      if (!downloadUrl) {
        throw new Error('Export succeeded but no download URL was returned');
      }
      return downloadUrl;
    }
    if (job.status === 'failed') {
      throw new Error(exportFailureMessage(job));
    }
    await sleep(pollIntervalMs);
  }
  throw new Error('Batch export timed out');
}

/**
 * POST /export-map/jobs, then poll GET until succeeded (download_url) or failed/timeout.
 */
export async function createMapExportJobAndWaitForDownloadUrl(
  body: MapExportJobRequestBody,
  options: WaitForMapExportJobOptions = {},
): Promise<{ downloadUrl: string; format: MapExportJobFormat }> {
  const { job_id: jobId } = await createMapExportJob(body);
  const downloadUrl = await waitForMapExportJobDownloadUrl(jobId, options);
  return { downloadUrl, format: body.format };
}
