import { BatchCadence } from './batchCadenceUtils';
import { EXPORT_MAP_SCHEDULES_API_URL } from './constants';

export type MapExportScheduleCadenceApi =
  | 'monthly'
  | 'quarterly'
  | 'every_n_dekads';

export type ScheduleExportQueryParams = {
  bounds: string;
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
  /** Export page locale (see ``EXPORT_LANGUAGE_PARAM`` / ExportView). */
  language?: string;
};

export type ScheduleAdminArea = {
  area_id: string;
  name: string;
};

export type ScheduleExportOptions = {
  origin: string;
  exportPath: string;
  queryParams: ScheduleExportQueryParams;
  viewportWidth?: number;
  viewportHeight?: number;
  /** Selected admin areas at schedule creation (codes + display names). */
  adminAreas?: ScheduleAdminArea[];
};

export type MapExportScheduleCreateRequest = {
  name: string;
  country: string;
  layer_id: string;
  cadence: MapExportScheduleCadenceApi;
  dekad_interval: number;
  format: 'pdf' | 'png';
  export_url: string;
  /** Opaque print-template metadata (viewport, etc.); shape owned by the frontend. */
  export_options: ScheduleExportOptions;
  /** Human-readable admin area names for admin console display. */
  admin_areas: string;
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
