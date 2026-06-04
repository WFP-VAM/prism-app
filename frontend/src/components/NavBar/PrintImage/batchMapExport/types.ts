import type { AdminCodeString } from 'config/types';
import type { LngLatBounds } from 'maplibre-gl';
import type { MapExportJobFormat } from 'utils/mapExportJobsApi';
import type { DateCompatibleLayer } from 'utils/server-utils';

import type { MapDimensions } from '../printConfig.context';
import type { Toggles } from '../printConfig.context';

export type BatchMapExportEnqueuePayload = {
  urls: string[];
  viewportWidth: number;
  viewportHeight: number;
  format: MapExportJobFormat;
  /** Country label forwarded to API for backend filename stem. */
  country: string;
  layerDisplayName: string;
  datesSummary: string;
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
  /** Present after GET exposes ``download_filename`` (server-derived). */
  downloadFilename: string | null;
  format: MapExportJobFormat;
  error: string | null;
};

export type BatchMapExportJobsActionsContextValue = {
  enqueueBatchMapExportJob: (payload: BatchMapExportEnqueuePayload) => void;
  dismissBatchMapExportJob: (clientId: string) => void;
};

export type BatchMapExportJobsStateContextValue = {
  jobs: BatchMapExportJobRow[];
};

/** @deprecated Prefer useBatchMapExportJobsActions + useBatchMapExportJobsState to avoid extra re-renders. */
export type BatchMapExportJobsContextValue =
  BatchMapExportJobsActionsContextValue & BatchMapExportJobsStateContextValue;

export type BuildBatchExportUrlsInput = {
  formattedDates: string[];
  origin: string;
  exportPath: string;
  baseSearchParams: URLSearchParams;
  printSelectedLayer: DateCompatibleLayer;
  mapBounds: LngLatBounds | null;
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
  /** Active i18n language code (e.g. pt) for server-side /export rendering. */
  language: string;
};
