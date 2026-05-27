import { BatchCadence } from './batchCadenceUtils';
import { EXPORT_MAP_SCHEDULES_API_URL } from './constants';

export type MapExportScheduleCadenceApi =
  | 'monthly'
  | 'quarterly'
  | 'every_n_dekads';

export type ScheduleExportQueryParams = {
  bounds: string;
  zoom?: string;
  mapWidth?: number;
  mapHeight?: number;
  aspectRatio?: string;
  customWidth?: number;
  customHeight?: number;
  title?: string;
  footer?: string;
  footerTextSize?: number;
  logoPosition?: number;
  logoScale?: number;
  legendPosition?: number;
  legendScale?: number;
  bottomLogoScale?: number;
  toggles?: Record<string, boolean>;
  selectedBoundaries?: string[];
};

export type ScheduleExportOptions = {
  origin: string;
  exportPath: string;
  queryParams: ScheduleExportQueryParams;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type MapExportScheduleCreateRequest = {
  country: string;
  layer_id: string;
  cadence: MapExportScheduleCadenceApi;
  dekad_interval: number;
  format: 'pdf';
  export_options: ScheduleExportOptions;
};

export type MapExportScheduleCreateResponse = {
  schedule_id: string;
  status: 'active';
  name: string;
  export_url: string;
};

export function cadenceToApi(
  cadence: BatchCadence,
): MapExportScheduleCadenceApi {
  if (cadence === 'every-n-dekads') {
    return 'every_n_dekads';
  }
  return cadence;
}

export async function createMapExportSchedule(
  body: MapExportScheduleCreateRequest,
): Promise<MapExportScheduleCreateResponse> {
  const response = await fetch(EXPORT_MAP_SCHEDULES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }
  return JSON.parse(text) as MapExportScheduleCreateResponse;
}
