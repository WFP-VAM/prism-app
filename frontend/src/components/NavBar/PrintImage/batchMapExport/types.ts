import type { MapExportJobFormat } from 'utils/mapExportJobsApi';
import type { LngLatBounds } from 'maplibre-gl';
import type { MapDimensions } from '../printConfig.context';
import type { DateCompatibleLayer } from 'utils/server-utils';
import type { Toggles } from '../printConfig.context';
import type { AdminCodeString } from 'config/types';

export type BatchMapExportEnqueuePayload = {
  urls: string[];
  viewportWidth: number;
  viewportHeight: number;
  format: MapExportJobFormat;
  layerDisplayName: string;
  datesSummary: string;
  /** Client-side save as filename only (blob download). */
  downloadFilename: string;
  mapTotal: number;
};

export type BatchMapExportJobRow = {
  clientId: string;
  serverJobId: string | null;
  status: string;
  progressCurrent: number | null;
  progressTotalFromApi: number | null;
  mapTotal: number;
  downloadUrl: string | null;
  layerDisplayName: string;
  datesSummary: string;
  downloadFilename: string;
  format: MapExportJobFormat;
  error: string | null;
};

export type BatchMapExportJobsContextValue = {
  jobs: BatchMapExportJobRow[];
  enqueueBatchMapExportJob: (payload: BatchMapExportEnqueuePayload) => void;
  dismissBatchMapExportJob: (clientId: string) => void;
};

export type BuildBatchExportUrlsInput = {
  formattedDates: string[];
  origin: string;
  exportPath: string;
  baseSearchParams: URLSearchParams;
  printSelectedLayer: DateCompatibleLayer;
  mapBounds: LngLatBounds | null;
  mapZoom: number | null;
  mapDimensions: MapDimensions;
  titleText: string;
  footerText: string;
  footerTextSize: number;
  logoPosition: number;
  logoScale: number;
  legendPosition: number;
  legendScale: number;
  bottomLogoScale: number;
  toggles: Toggles;
  selectedBoundaries: AdminCodeString[];
};
